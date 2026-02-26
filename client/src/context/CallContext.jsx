import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import CallModal from '../components/CallModal';

const CallContext = createContext();

// Use public STUN servers for NAT Traversal
const peerConnectionConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export const CallProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [stream, setStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState('');
    const [callerName, setCallerName] = useState('');
    const [callerSignal, setCallerSignal] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [callType, setCallType] = useState('video'); // 'voice' | 'video'
    const [isAutoMatch, setIsAutoMatch] = useState(false);

    const myVideo = useRef();
    const userVideo = useRef();
    const peerConnection = useRef(null);
    const streamRef = useRef(null);
    const isAutoMatchRef = useRef(false);
    const callTypeRef = useRef('video');

    useEffect(() => {
        if (user) {
            const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
            setSocket(newSocket);

            newSocket.on('connect', () => {
                newSocket.emit('register_user', user._id);
            });

            newSocket.on('incoming_call', (data) => {
                setReceivingCall(true);
                setCaller(data.from);
                setCallerName(data.fromName);
                setCallerSignal(data.signal);
                setCallType(data.callType || 'video');
                setIsAutoMatch(data.isAutoMatch || false);
            });

            newSocket.on('call_ended', () => {
                const wasAutoMatch = isAutoMatchRef.current;
                const currentType = callTypeRef.current;
                leaveCall(false);

                // If it was an auto match and the other person dropped, instantly requeue us!
                if (wasAutoMatch) {
                    window.dispatchEvent(new CustomEvent('PRACTICE_SKIP_MATCH', { detail: { type: currentType } }));
                }
            });

            return () => newSocket.close();
        }
    }, [user]);

    // Keep Refs synced for Socket callbacks
    useEffect(() => { streamRef.current = stream; }, [stream]);
    useEffect(() => { callTypeRef.current = callType; }, [callType]);
    useEffect(() => { isAutoMatchRef.current = isAutoMatch; }, [isAutoMatch]);

    // Listen for WebRTC Signaling from other side
    useEffect(() => {
        if (!socket) return;

        const handleAnswered = async (signal) => {
            setCallAccepted(true);
            if (peerConnection.current) {
                try {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
                } catch (e) {
                    console.error("Failed to set remote description", e);
                }
            }
        };

        socket.on('call_answered', handleAnswered);

        socket.on('call_failed', (data) => {
            alert(`Call failed: ${data.reason}`);
            leaveCall();
        });

        // Receiving ICE candidates from remote
        socket.on('ice_candidate', async (candidate) => {
            if (peerConnection.current && candidate) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding received ice candidate", e);
                }
            }
        });

        return () => {
            socket.off('call_answered', handleAnswered);
            socket.off('call_failed');
            socket.off('ice_candidate');
        };
    }, [socket]);

    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Auto-answer logic for matchmaking
    useEffect(() => {
        if (receivingCall && isAutoMatch && caller && callerSignal) {
            const timer = setTimeout(() => {
                answerCall(caller, callerSignal, callType);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [receivingCall, isAutoMatch, caller, callerSignal, callType]);

    const createPeerConnection = (targetUserId, currentStream = null) => {
        const pc = new RTCPeerConnection(peerConnectionConfig);

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('ice_candidate', {
                    to: targetUserId,
                    candidate: event.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            if (userVideo.current) {
                userVideo.current.srcObject = event.streams[0];
            }
        };

        const activeStream = currentStream || stream;
        if (activeStream) {
            activeStream.getTracks().forEach(track => {
                pc.addTrack(track, activeStream);
            });
        }

        peerConnection.current = pc;
        return pc;
    };

    const callUser = async (idToCall, isVideoCall = true, autoMatchFlag = false) => {
        try {
            let cType = isVideoCall ? 'video' : 'voice';
            setCallType(cType);
            setIsAutoMatch(autoMatchFlag);

            let currentStream;
            try {
                currentStream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });
            } catch (mediaErr) {
                if (isVideoCall && (mediaErr.name === 'NotFoundError' || mediaErr.name === 'NotAllowedError' || mediaErr.name === 'NotReadableError' || mediaErr.name === 'OverconstrainedError')) {
                    console.warn("Camera access failed, falling back to audio only");
                    currentStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    cType = 'voice';
                    setCallType('voice');
                    alert("Camera not found or blocked. Falling back to voice only.");
                } else {
                    throw mediaErr; // Throw to main catch block (e.g., no microphone)
                }
            }

            setStream(currentStream);
            setIsCalling(true);
            setCaller(idToCall); // Set caller state to the peer we are calling so leaveCall works

            setTimeout(() => {
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }
            }, 100);

            const pc = createPeerConnection(idToCall, currentStream);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('call_user', {
                userToCall: idToCall,
                signalData: offer, // the offer is the initial signal
                from: user._id,
                fromName: user.name,
                callType: cType,
                isAutoMatch: autoMatchFlag
            });

        } catch (err) {
            console.error("Failed to make call", err);
            alert("Could not access microphone/camera. Please ensure you have a working microphone and have granted browser permissions.");
            setIsCalling(false);
        }
    };

    const answerCall = async (overrideCaller = caller, overrideSignal = callerSignal, overrideType = callType) => {
        try {
            let currentStream;
            try {
                currentStream = await navigator.mediaDevices.getUserMedia({ video: overrideType === 'video', audio: true });
            } catch (mediaErr) {
                if (overrideType === 'video' && (mediaErr.name === 'NotFoundError' || mediaErr.name === 'NotAllowedError' || mediaErr.name === 'NotReadableError' || mediaErr.name === 'OverconstrainedError')) {
                    console.warn("Camera access failed, falling back to audio only");
                    currentStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    setCallType('voice'); // downgrade UI
                    alert("Camera not found or blocked. Falling back to voice only.");
                } else {
                    throw mediaErr;
                }
            }

            setStream(currentStream);
            setCallAccepted(true);
            setReceivingCall(false);

            setTimeout(() => {
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }
            }, 100);

            const pc = createPeerConnection(overrideCaller, currentStream);

            if (overrideSignal) {
                await pc.setRemoteDescription(new RTCSessionDescription(overrideSignal));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('answer_call', { signal: answer, to: overrideCaller });
            }

        } catch (err) {
            console.error("Failed to answer call", err);
            alert("Could not access microphone/camera to answer. Please check your devices and permissions.");
        }
    };

    const leaveCall = (emitEvent = true) => {
        setCallEnded(true);
        setReceivingCall(false);
        setIsCalling(false);
        setCallAccepted(false);

        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        // Forcefully ensure hardware track shutdown via Refs
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        // Blank out the video source so the camera light definitely clicks off
        if (myVideo.current) myVideo.current.srcObject = null;
        if (userVideo.current) userVideo.current.srcObject = null;

        if (emitEvent && socket && caller) {
            socket.emit('end_call', { to: caller });
        }

        setTimeout(() => {
            setCallEnded(false);
            setCaller('');
            setCallerSignal(null);
            setCallerName('');
        }, 1000);
    };

    return (
        <CallContext.Provider value={{
            callAccepted,
            myVideo,
            userVideo,
            stream,
            callEnded,
            callUser,
            leaveCall,
            answerCall,
            receivingCall,
            callerName,
            isCalling,
            socket,
            callType,
            isAutoMatch
        }}>
            {children}
            {(receivingCall || isCalling || callAccepted) && !callEnded && (
                <CallModal />
            )}
        </CallContext.Provider>
    );
};

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error("useCall must be used within a CallProvider");
    }
    return context;
};
