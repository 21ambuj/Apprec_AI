import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, FastForward } from 'lucide-react';

// Note: In typical apps this would consume state from the Context directly so it doesn't need to be passed down.
// Since we rendered it inside CallProvider, we can use the hook.
import { useCall } from '../context/CallContext';

const CallModal = () => {
    const {
        callAccepted,
        myVideo,
        userVideo,
        callEnded,
        leaveCall,
        answerCall,
        receivingCall,
        callerName,
        isCalling,
        callType,
        isAutoMatch
    } = useCall();

    const [micMuted, setMicMuted] = React.useState(false);
    const [videoMuted, setVideoMuted] = React.useState(false);
    const [callDuration, setCallDuration] = useState(0);

    useEffect(() => {
        let timer;
        if (callAccepted && !callEnded) {
            timer = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => clearInterval(timer);
    }, [callAccepted, callEnded]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const toggleMic = () => {
        if (myVideo.current && myVideo.current.srcObject) {
            myVideo.current.srcObject.getAudioTracks()[0].enabled = micMuted;
            setMicMuted(!micMuted);
        }
    };

    const toggleVideo = () => {
        if (myVideo.current && myVideo.current.srcObject && callType !== 'voice') {
            myVideo.current.srcObject.getVideoTracks()[0].enabled = videoMuted;
            setVideoMuted(!videoMuted);
        }
    };

    const handleSkip = () => {
        leaveCall();
        window.dispatchEvent(new CustomEvent('PRACTICE_SKIP_MATCH', { detail: { type: callType } }));
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4"
            >
                <div className="bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative border border-slate-700">

                    {/* Header */}
                    <div className="p-4 bg-slate-900 flex justify-between items-center text-white shrink-0">
                        <h3 className="font-bold flex items-center gap-2">
                            {callAccepted ? (
                                <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Call in progress - {formatTime(callDuration)}</>
                            ) : receivingCall ? (
                                <><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Incoming Call from {callerName}...</>
                            ) : (
                                <><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Calling...</>
                            )}
                        </h3>
                    </div>

                    {/* Video Area */}
                    <div className="flex-1 bg-black relative flex flex-col md:flex-row overflow-hidden min-h-[400px]">
                        {callType === 'voice' ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-slate-800 relative z-10 w-full">
                                <div className="w-32 h-32 rounded-full bg-blue-500/20 flex items-center justify-center relative mb-6">
                                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                                    <div className="w-24 h-24 bg-blue-600 rounded-full flex flex-col items-center justify-center text-white font-bold text-3xl z-10 shadow-xl border-4 border-blue-400">
                                        {callerName ? callerName.charAt(0).toUpperCase() : '?'}
                                    </div>
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <span className="w-1.5 h-6 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                    <span className="w-1.5 h-10 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                    <span className="w-1.5 h-12 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-1.5 h-8 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                                    <span className="w-1.5 h-6 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                                <h3 className="text-blue-100 font-medium tracking-wide">Secure Voice Connection</h3>
                                <video playsInline ref={userVideo} autoPlay className="hidden" />
                                <video playsInline muted ref={myVideo} autoPlay className="hidden" />
                            </div>
                        ) : (
                            <>
                                {/* Remote Video (Full Screen if accepted) */}
                                <div className="flex-1 relative flex items-center justify-center">
                                    <video playsInline ref={userVideo} autoPlay className={`w-full h-full object-cover ${!(callAccepted && !callEnded) ? 'hidden' : ''}`} />

                                    {!(callAccepted && !callEnded) && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10">
                                            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-4xl mb-4 font-bold text-slate-400">
                                                {callerName ? callerName.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <p className="text-xl">{receivingCall ? `${callerName} is calling you` : 'Waiting for answer...'}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Local Video (PiP style) */}
                                <motion.div
                                    drag
                                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                    className="absolute bottom-4 right-4 w-32 h-48 md:w-48 md:h-64 bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-600 shadow-xl z-20 cursor-move"
                                >
                                    <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover scale-x-[-1]" />
                                    <div className="absolute bottom-2 right-2 flex gap-1">
                                        {micMuted && <span className="p-1 bg-red-500 rounded text-white"><MicOff size={12} /></span>}
                                        {videoMuted && <span className="p-1 bg-red-500 rounded text-white"><VideoOff size={12} /></span>}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </div>

                    {/* Call Controls */}
                    <div className="p-6 bg-slate-900 shrink-0 flex justify-center items-center gap-6">

                        {(callAccepted || isCalling) && (
                            <>
                                <button onClick={toggleMic} className={`p-4 rounded-full transition-colors ${micMuted ? 'bg-red-500/20 text-red-500' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                                    {micMuted ? <MicOff size={24} /> : <Mic size={24} />}
                                </button>
                                {callType !== 'voice' && (
                                    <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${videoMuted ? 'bg-red-500/20 text-red-500' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                                        {videoMuted ? <VideoOff size={24} /> : <Video size={24} />}
                                    </button>
                                )}
                            </>
                        )}

                        {receivingCall && !callAccepted ? (
                            <button onClick={answerCall} className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold flex items-center gap-2 shadow-lg shadow-green-500/30">
                                <Phone size={20} /> Answer
                            </button>
                        ) : null}

                        <button onClick={leaveCall} className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold flex items-center gap-2 shadow-lg shadow-red-500/30">
                            <PhoneOff size={20} /> {receivingCall && !callAccepted ? 'Decline' : 'End Call'}
                        </button>

                        {isAutoMatch && (
                            <button onClick={handleSkip} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold flex items-center gap-2 shadow-lg shadow-amber-500/30">
                                <FastForward size={20} /> Skip
                            </button>
                        )}
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CallModal;
