import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  registerDeviceToken,
  listenForForegroundMessages,
  stopListeningForMessages,
  sendPushNotification,
} from "./lib/notifications";
import "./App.css";



export default function App() {
  const [session, setSession] = useState(null);

  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [connections, setConnections] = useState([]);

  /* PUBLIC PROFILE VIEW STATE */
  const [viewingProfile, setViewingProfile] = useState(null);
  const [viewingProfileId, setViewingProfileId] = useState(null);
  const [loadingViewProfile, setLoadingViewProfile] = useState(false);
  const [profileViewStack, setProfileViewStack] = useState([]);

  const [page, setPage] = useState("login"); // "discover" | "chat" | "profile" | "login"
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");

  /* CHAT STATE */
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [recentMessages, setRecentMessages] = useState([]);

  /* CONVERSATION & REALTIME CHAT STATE */
  const [dbConversations, setDbConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const presenceChannelRef = useRef(null);
  const typingChannelRef = useRef(null);
  const conversationChannelRef = useRef(null);

  /* REPLY & REACTIONS STATE */
  const [replyTo, setReplyTo] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);

  /* MESSAGE ACTION MENU STATE */
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const longPressTimerRef = useRef(null);
  const longPressMovedRef = useRef(false);

  /* CONVERSATION CONTEXT MENU STATE */
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [convMenuTarget, setConvMenuTarget] = useState(null);
  const [convMenuPos, setConvMenuPos] = useState({ top: 0, left: 0 });
  const convLongPressRef = useRef(null);

  /* VOICE RECORDING STATE */
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const audioStreamRef = useRef(null);

  /* VOICE PLAYBACK STATE */
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [voiceProgress, setVoiceProgress] = useState({});
  const audioPlayerRef = useRef(null);

  /* WAVEFORM VISUALIZATION STATE */
  const [waveformData, setWaveformData] = useState(new Array(30).fill(0));
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recordingTimeRef = useRef(0);

  /* CAMERA & MEDIA STATE */
  const cameraInputRef = useRef(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaPreviewFile, setMediaPreviewFile] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo"); // "photo" | "video"
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const cameraStreamRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const mediaRecorderChunksRef = useRef([]);
  const mediaRecorderRef2 = useRef(null);

  /* POINTS & SESSIONS STATE */
  const [skillPoints, setSkillPoints] = useState(0);
  const [teachingSessions, setTeachingSessions] = useState([]);
  const [pointHistory, setPointHistory] = useState([]);
  const [showRewardToast, setShowRewardToast] = useState(false);
  const [rewardToastMsg, setRewardToastMsg] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const [completingSession, setCompletingSession] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [sessionSkillInput, setSessionSkillInput] = useState("");
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());

  /* PUSH NOTIFICATION STATE */
  const notificationInitializedRef = useRef(false);

  /* VOICE/VIDEO CALL STATE */
  const [callState, setCallState] = useState(null); // null | { id, type, status, callerId, receiverId, callerName }
  const [incomingCall, setIncomingCall] = useState(null); // null | { id, type, callerId, callerName }
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [callError, setCallError] = useState("");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const callChannelRef = useRef(null);

  /* LIVE SESSION MEDIA REFS */
  const liveLocalVideoRef = useRef(null);
  const liveRemoteVideoRef = useRef(null);
  const liveLocalStreamRef = useRef(null);
  const livePeerConnectionRef = useRef(null);
  const liveSignalingChannelRef = useRef(null);

  
  /* =========================
     SESSIONS STATE & HELPERS
  ========================= */

  const [learningSessions, setLearningSessions] = useState([]);
  const [activeSessionTab, setActiveSessionTab] = useState("upcoming");
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [createSessionForm, setCreateSessionForm] = useState({
    skill: "", type: "teach", topic: "", duration: "45",
    participantId: "", description: ""
  });
  const [activeLiveSession, setActiveLiveSession] = useState(null);
  const [sessionView, setSessionView] = useState(null);
  const [liveSessionState, setLiveSessionState] = useState({
    isMuted: false, isCameraOn: true, isScreenSharing: false,
    isWorkspaceOpen: false, isChatOpen: false, isParticipantOpen: false,
    timer: 0, notes: "", checklist: [], chatMessages: [], rating: 0, feedback: ""
  });
  const [sessionSummaryData, setSessionSummaryData] = useState(null);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);

  async function loadLearningSessions(userId) {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("learning_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Learning sessions query error:", error.message);
        return;
      }
      if (data) {
        const filtered = data.filter(s => s.host_id === userId || s.participant_id === userId);
        setLearningSessions(filtered);
      }
    } catch (err) {
      console.warn("Could not load learning sessions:", err?.message);
    }
  }

  /* =========================
     REWARDS / POINTS SYSTEM
  ========================= */

  const SESSION_COST = 5;
  const ADS_FOR_REWARD = 2;
  const POINTS_PER_AD = 5;
  const TOTAL_AD_REWARD = POINTS_PER_AD * ADS_FOR_REWARD;

  const [skillPointsLocal, setSkillPointsLocal] = useState(() => {
    try {
      const stored = localStorage.getItem("skillswap_points");
      if (stored !== null) return parseInt(stored, 10);
      localStorage.setItem("skillswap_points", "20");
      return 20;
    } catch { return 20; }
  });

  const [rewardHistory, setRewardHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("skillswap_reward_history") || "[]"); }
    catch { return []; }
  });

  const [adProgress, setAdProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem("skillswap_ad_progress") || "{\"adsCompleted\":0,\"rewardClaimed\":false}"); }
    catch { return { adsCompleted: 0, rewardClaimed: false }; }
  });

  const [showRewardsPage, setShowRewardsPage] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adState, setAdState] = useState("idle"); // idle | playing | completed | skipped
  const [adCountdown, setAdCountdown] = useState(0);
  const [adNumber, setAdNumber] = useState(1);
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [showEarnModal, setShowEarnModal] = useState(false);
  const [showRewardSuccess, setShowRewardSuccess] = useState(false);

  function persistPoints(pts) {
    localStorage.setItem("skillswap_points", pts.toString());
  }

  function persistRewardHistory(hist) {
    localStorage.setItem("skillswap_reward_history", JSON.stringify(hist));
  }

  function persistAdProgress(prog) {
    localStorage.setItem("skillswap_ad_progress", JSON.stringify(prog));
  }

  function addTransaction(type, amount, reason) {
    const tx = {
      id: generateId(),
      type,
      amount,
      reason,
      timestamp: Date.now()
    };
    const updated = [tx, ...rewardHistory];
    setRewardHistory(updated);
    persistRewardHistory(updated);
  }

  function addPoints(amount, reason) {
    const newBalance = skillPointsLocal + amount;
    setSkillPointsLocal(newBalance);
    persistPoints(newBalance);
    addTransaction("earned", amount, reason);
  }

  function spendPoints(amount, reason) {
    if (skillPointsLocal < amount) return false;
    const newBalance = skillPointsLocal - amount;
    setSkillPointsLocal(newBalance);
    persistPoints(newBalance);
    addTransaction("spent", amount, reason);
    return true;
  }

  function canAfford(amount) {
    return skillPointsLocal >= amount;
  }

  /* =========================
     REWARDED AD SERVICE
  ========================= */

  const RewardedAdService = {
    isAdAvailable() {
      return true;
    },
    showRewardedAd(onCompleted, onSkipped, onFailed) {
      setAdState("playing");
      setAdCountdown(5);
      let countdownVal = 5;
      const timer = setInterval(() => {
        countdownVal--;
        setAdCountdown(countdownVal);
        if (countdownVal <= 0) {
          clearInterval(timer);
          setAdState("completed");
          if (onCompleted) onCompleted();
        }
      }, 1000);
      adTimerRef.current = timer;
    },
    cancelAd() {
      if (adTimerRef.current) {
        clearInterval(adTimerRef.current);
        adTimerRef.current = null;
      }
      setAdState("skipped");
    }
  };

  const adTimerRef = useRef(null);

  function startAdFlow() {
    const newCompleted = adProgress.adsCompleted + 1;
    const progress = { ...adProgress, adsCompleted: newCompleted };
    setAdProgress(progress);
    persistAdProgress(progress);
    setAdNumber(newCompleted);
    setAdState("idle");
    setShowAdModal(true);

    setTimeout(() => {
      RewardedAdService.showRewardedAd(
        () => {
          addTransaction("earned", POINTS_PER_AD, "Watched rewarded ad " + newCompleted + "/" + ADS_FOR_REWARD);
        },
        () => { setAdState("skipped"); },
        () => { setAdState("skipped"); }
      );
    }, 500);
  }

  function handleAdComplete() {
    const currentProgress = { ...adProgress };
    if (adNumber >= ADS_FOR_REWARD) {
      const newBalance = skillPointsLocal + TOTAL_AD_REWARD;
      setSkillPointsLocal(newBalance);
      persistPoints(newBalance);
      addTransaction("earned", TOTAL_AD_REWARD, "Watched 2 rewarded ads");
      setAdProgress({ adsCompleted: 0, rewardClaimed: true });
      persistAdProgress({ adsCompleted: 0, rewardClaimed: true });
      setShowAdModal(false);
      setShowRewardSuccess(true);
    } else {
      setAdState("idle");
      setTimeout(() => {
        setAdNumber(adNumber + 1);
        RewardedAdService.showRewardedAd(
          () => {
            addTransaction("earned", POINTS_PER_AD, "Watched rewarded ad " + (adNumber + 1) + "/" + ADS_FOR_REWARD);
          },
          () => { setAdState("skipped"); },
          () => { setAdState("skipped"); }
        );
      }, 300);
    }
  }

  function handleAdSkip() {
    RewardedAdService.cancelAd();
    showMessage("Ad was not completed. No points were awarded.");
    if (adNumber >= ADS_FOR_REWARD) {
      setShowAdModal(false);
    }
  }

  function resetAdProgress() {
    setAdProgress({ adsCompleted: 0, rewardClaimed: false });
    persistAdProgress({ adsCompleted: 0, rewardClaimed: false });
  }

  function getRewardHistoryDisplay() {
    return rewardHistory.slice(0, 20).map(tx => {
      const now = Date.now();
      const diff = now - tx.timestamp;
      let dateStr = "Today";
      if (diff > 86400000) dateStr = "Yesterday";
      if (diff > 172800000) dateStr = Math.floor(diff / 86400000) + " days ago";
      return { ...tx, dateStr };
    });
  }

  function handleJoinSession(session) {
    if (!canAfford(SESSION_COST)) {
      setShowEarnModal(true);
      return;
    }
    if (confirm("Join this session for " + SESSION_COST + " points?\n\n🪙 Current balance: " + skillPointsLocal + "\n🪙 After joining: " + (skillPointsLocal - SESSION_COST))) {
      spendPoints(SESSION_COST, "Joined learning session");
      joinLiveSession(session);
      fireRewardToast("🪙 " + SESSION_COST + " points used");
    }
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  async function createLearningSession() {
    const f = createSessionForm;
    if (!f.skill || !f.topic || !f.participantId) {
      showError("Please fill in all required fields.");
      return;
    }
    const participant = findPerson(f.participantId);
    const newSession = {
      id: generateId(),
      title: f.topic,
      skill: f.skill,
      topic: f.topic,
      type: f.type,
      host_id: session.user.id,
      host_name: getName(profile),
      participant_id: f.participantId,
      participant_name: participant ? getName(participant) : "Unknown",
      duration: parseInt(f.duration),
      status: "upcoming",
      description: f.description,
      notes: "",
      checklist: [
        { id: 1, text: "Introduction", done: false },
        { id: 2, text: "Basic concepts", done: false },
        { id: 3, text: "Examples", done: false },
        { id: 4, text: "Practice", done: false },
        { id: 5, text: "Questions", done: false },
        { id: 6, text: "Summary", done: false },
      ],
      messages: [],
      rating: 0,
      feedback: "",
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from("learning_sessions").insert(newSession);
    if (error) {
      showError("Failed to create session: " + error.message);
      return;
    }
    setLearningSessions(prev => [newSession, ...prev]);
    setShowCreateSession(false);
    setCreateSessionForm({ skill: "", type: "teach", topic: "", duration: "45", participantId: "", description: "" });
    showMessage("🎉 Session created successfully!");

    sendPushNotification(f.participantId, {
      title: "New session request",
      body: `${getName(profile)} wants to ${f.type} "${f.topic}" with you`,
      type: "session_request",
      requestId: newSession.id,
      senderId: session.user.id,
      senderName: getName(profile),
      tag: `session-request-${newSession.id}`,
    }).catch(() => {});
  }

  async function acceptSessionInvitation(sessionId) {
    const sessionToAccept = learningSessions.find(s => s.id === sessionId);
    const { error } = await supabase
      .from("learning_sessions")
      .update({ status: "accepted" })
      .eq("id", sessionId);
    if (!error) {
      setLearningSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, status: "accepted" } : s
      ));
      showMessage("✅ Session accepted!");

      if (sessionToAccept?.host_id && sessionToAccept.host_id !== session?.user?.id) {
        sendPushNotification(sessionToAccept.host_id, {
          title: "Session accepted",
          body: `${getName(profile)} accepted your session request for "${sessionToAccept.skill || sessionToAccept.topic}"`,
          type: "session_accepted",
          sessionId: sessionId,
          senderId: session.user.id,
          senderName: getName(profile),
          tag: `session-accepted-${sessionId}`,
        }).catch(() => {});
      }
    }
  }

  async function declineSessionInvitation(sessionId) {
    const { error } = await supabase
      .from("learning_sessions")
      .update({ status: "declined" })
      .eq("id", sessionId);
    if (!error) {
      setLearningSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, status: "declined" } : s
      ));
      showMessage("Session declined.");
    }
  }

  async function joinLiveSession(session) {
    const notes = session.notes || "";
    const checklist = session.checklist || [];
    setActiveLiveSession(session);
    setSessionView("live");
    setLiveSessionState({
      isMuted: false, isCameraOn: false, isScreenSharing: false,
      isWorkspaceOpen: false, isChatOpen: false, isParticipantOpen: false,
      timer: 0, notes, checklist,
      chatMessages: session.messages || [], rating: 0, feedback: ""
    });
    await supabase
      .from("learning_sessions")
      .update({ status: "live" })
      .eq("id", session.id);
    setLearningSessions(prev => prev.map(s =>
      s.id === session.id ? { ...s, status: "live" } : s
    ));
  }

  async function leaveLiveSession() {
    if (!activeLiveSession) return;
    cleanupLiveMedia();
    await supabase
      .from("learning_sessions")
      .update({ status: "completed" })
      .eq("id", activeLiveSession.id);
    setLearningSessions(prev => prev.map(s =>
      s.id === activeLiveSession.id ? { ...s, status: "completed" } : s
    ));
    setSessionSummaryData({ ...activeLiveSession, status: "completed" });
    setSessionView("summary");
    setActiveLiveSession(null);
  }

  /* =========================
     LIVE SESSION CAMERA & WEBRTC
  ========================= */

  function cleanupLiveMedia() {
    setRemoteVideoActive(false);
    if (liveLocalStreamRef.current) {
      liveLocalStreamRef.current.getTracks().forEach(t => t.stop());
      liveLocalStreamRef.current = null;
    }
    if (livePeerConnectionRef.current) {
      livePeerConnectionRef.current.close();
      livePeerConnectionRef.current = null;
    }
    if (liveSignalingChannelRef.current) {
      supabase.removeChannel(liveSignalingChannelRef.current);
      liveSignalingChannelRef.current = null;
    }
    if (liveLocalVideoRef.current) liveLocalVideoRef.current.srcObject = null;
    if (liveRemoteVideoRef.current) liveRemoteVideoRef.current.srcObject = null;
  }

  function createLivePeerConnection() {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    livePeerConnectionRef.current = pc;

    if (liveLocalStreamRef.current) {
      liveLocalStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, liveLocalStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && liveSignalingChannelRef.current) {
        liveSignalingChannelRef.current.send({
          type: "broadcast",
          event: "live-signal",
          payload: { type: "ice-candidate", candidate: event.candidate, senderId: session.user.id },
        });
      }
    };

    pc.ontrack = (event) => {
      if (liveRemoteVideoRef.current) {
        liveRemoteVideoRef.current.srcObject = event.streams[0];
        setRemoteVideoActive(true);
      }
    };

    return pc;
  }

  async function setupLiveSessionSignaling() {
    if (!activeLiveSession || liveSignalingChannelRef.current) return;
    const sessionId = activeLiveSession.id;
    const myId = session.user.id;
    const isHost = activeLiveSession.host_id === myId;

    const channel = supabase.channel("live-session-" + sessionId);
    liveSignalingChannelRef.current = channel;

    channel
      .on("broadcast", { event: "live-signal" }, async (msg) => {
        const payload = msg.payload;
        if (payload.senderId === myId) return;

        if (payload.type === "offer" && !isHost) {
          const pc = createLivePeerConnection();
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: "broadcast",
              event: "live-signal",
              payload: { type: "answer", answer, senderId: myId },
            });
          } catch (err) {
            console.error("Live session: Error handling offer:", err);
          }
        } else if (payload.type === "answer" && isHost) {
          const pc = livePeerConnectionRef.current;
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            } catch (err) {
              console.error("Live session: Error handling answer:", err);
            }
          }
        } else if (payload.type === "ice-candidate") {
          const pc = livePeerConnectionRef.current;
          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (err) {
              console.error("Live session: Error adding ICE candidate:", err);
            }
          }
        } else if (payload.type === "peer-ready" && isHost && liveLocalStreamRef.current) {
          const pc = createLivePeerConnection();
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel.send({
              type: "broadcast",
              event: "live-signal",
              payload: { type: "offer", offer, senderId: myId },
            });
          } catch (err) {
            console.error("Live session: Error creating offer for new peer:", err);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && !isHost && liveLocalStreamRef.current) {
          channel.send({
            type: "broadcast",
            event: "live-signal",
            payload: { type: "peer-ready", senderId: myId },
          });
        }
      });

    if (isHost && liveLocalStreamRef.current) {
      const pc = createLivePeerConnection();
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({
          type: "broadcast",
          event: "live-signal",
          payload: { type: "offer", offer, senderId: myId },
        });
      } catch (err) {
        console.error("Live session: Error creating offer:", err);
      }
    }
  }

  async function toggleLiveCamera() {
    if (liveSessionState.isCameraOn) {
      if (liveLocalStreamRef.current) {
        liveLocalStreamRef.current.getTracks().forEach(t => t.stop());
        liveLocalStreamRef.current = null;
      }
      if (livePeerConnectionRef.current) {
        livePeerConnectionRef.current.close();
        livePeerConnectionRef.current = null;
      }
      if (liveLocalVideoRef.current) liveLocalVideoRef.current.srcObject = null;
      if (liveRemoteVideoRef.current) liveRemoteVideoRef.current.srcObject = null;
      setRemoteVideoActive(false);
      setLiveSessionState(p => ({ ...p, isCameraOn: false }));
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        liveLocalStreamRef.current = stream;
        if (liveLocalVideoRef.current) {
          liveLocalVideoRef.current.srcObject = stream;
        }
        setLiveSessionState(p => ({ ...p, isCameraOn: true, isMuted: false }));
        await setupLiveSessionSignaling();
      } catch (err) {
        console.error("Camera error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          showMessage("Camera/microphone permission denied. Please allow access in your browser settings.");
        } else if (err.name === "NotFoundError") {
          showMessage("No camera or microphone found on this device.");
        } else if (err.name === "NotReadableError") {
          showMessage("Camera is already in use by another application.");
        } else {
          showMessage("Could not access camera: " + err.message);
        }
      }
    }
  }

  function toggleLiveMic() {
    if (liveLocalStreamRef.current) {
      const audioTrack = liveLocalStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setLiveSessionState(p => ({ ...p, isMuted: !audioTrack.enabled }));
      }
    }
  }

  async function submitSessionFeedback() {
    if (!sessionSummaryData) return;
    await supabase
      .from("learning_sessions")
      .update({ rating: liveSessionState.rating })
      .eq("id", sessionSummaryData.id);
    setLearningSessions(prev => prev.map(s =>
      s.id === sessionSummaryData.id
        ? { ...s, rating: liveSessionState.rating }
        : s
    ));
    addPoints(2, "Rated teacher after session");
    fireRewardToast("⭐ Thanks for rating! +2 Points awarded.");
    setSessionView(null);
    setSessionSummaryData(null);
    setPage("sessions");
  }

  function openSessionSummary(session) {
    setSessionSummaryData(session);
    setSessionView("summary");
  }

  async function deleteLearningSession(sessionId) {
    if (!confirm("Are you sure you want to delete this session?")) return;
    const { error } = await supabase
      .from("learning_sessions")
      .delete()
      .eq("id", sessionId);
    if (!error) {
      setLearningSessions(prev => prev.filter(s => s.id !== sessionId));
      showMessage("🗑️ Session deleted.");
    } else {
      showError("Failed to delete session.");
    }
  }

  const myId = session?.user?.id;

  useEffect(() => {
    if (myId) {
      loadLearningSessions(myId);
    }
  }, [myId]);

  // Mobile viewport height handler (fixes iOS keyboard issues)
  useEffect(() => {
    function setVH() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }
    setVH();
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", () => setTimeout(setVH, 100));
    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);

  // Handle session invite links (?session=ID)
  useEffect(() => {
    if (!myId) return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session");
    if (sessionId) {
      loadLearningSessions(myId).then(() => {
        const params2 = new URLSearchParams(window.location.search);
        params2.delete("session");
        window.history.replaceState({}, "", window.location.pathname + params2.toString());
      });
    }
  }, [myId]);

  // Realtime subscription for learning sessions
  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel("learning-sessions-" + myId)
      .on("postgres_changes", { event: "*", schema: "public", table: "learning_sessions" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setLearningSessions(prev => {
            if (prev.some(s => s.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          setLearningSessions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        } else if (payload.eventType === "DELETE") {
          setLearningSessions(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myId]);

  const upcomingSessions = learningSessions.filter(s => (s.status === "upcoming" || s.status === "accepted" || s.status === "live") && (s.host_id === myId || s.participant_id === myId));
  const liveSessions = learningSessions.filter(s => s.status === "live" && (s.host_id === myId || s.participant_id === myId));
  const pastSessions = learningSessions.filter(s => (s.status === "completed" || s.status === "declined") && (s.host_id === myId || s.participant_id === myId));

  const skillOptions = ["Python", "Java", "JavaScript", "React", "DSA", "C++", "Web Development", "Other"];
  const typeOptions = [{ value: "teach", label: "🎓 Teach" }, { value: "learn", label: "📚 Learn" }, { value: "swap", label: "🔄 Skill Swap" }];
  const durationOptions = ["30", "45", "60", "90"];
  const messagesContainerRef = useRef(null);
  const prevMessagesCountRef = useRef(0);
  const chatFileInputRef = useRef(null);
  const profileImageInputRef = useRef(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  /* LOGIN STATE */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpName, setSignUpName] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    bio: "",
    location: "",
    avatar_url: "",
    skills_teach: "",
    skills_learn: "",
    languages: "",
    experience: "",
    availability: "",
    privacy_settings: {
      show_location: true,
      show_bio: true,
      show_skills: true,
      show_reviews: true,
      show_stats: true,
      show_availability: true,
    },
  });

  /* =========================
     AUTH / INITIAL LOAD
  ========================= */

  useEffect(() => {
    let mounted = true;

    async function startApp() {
      try {
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn("Session error:", sessionError);
        }

        if (!mounted) return;

        if (currentSession?.user?.id) {
          setSession(currentSession);
          setPage("discover");
          await loadUserData(currentSession.user.id);
        } else {
          setPage("login");
        }
      } catch (err) {
        console.error("Auth init error:", err);
        setPage("login");
      }
    }

    startApp();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return;

      if (_event === "SIGNED_OUT") {
        // handleLogout already handles cleanup; this is a safety net
        setPage((current) => (current !== "login" ? "login" : current));
        return;
      }

      if (currentSession?.user?.id) {
        setSession(currentSession);
        try {
          await loadUserData(currentSession.user.id);
        } catch (err) {
          console.error(err);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
      stopListeningForMessages();
    };
  }, []);

  /* =========================
     LOGOUT
  ========================= */

  async function handleLogout() {
    try {
      setLoading(true);
      setShowAccountMenu(false);

      // Clean up realtime channels
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
      }

      stopListeningForMessages();
      notificationInitializedRef.current = false;

      await supabase.auth.signOut();
      // Reset all state
      setSession(null);
      setProfile(null);
      setSkillPoints(0);
      setTeachingSessions([]);
      setPointHistory([]);
      setConnections([]);
      setRecentMessages([]);
      setProfiles([]);
      setLearningSessions([]);
      setActiveChatUser(null);
      setChatMessages([]);
      setDbConversations([]);
      setActiveConversationId(null);
      setTypingUsers({});
      setOnlineUsers(new Set());
      setReplyTo(null);
      setShowReactionPicker(null);
      setShowRewardToast(false);
      setSearch("");
      setChatSearch("");
      setEditing(false);
      setLoginEmail("");
      setLoginPassword("");
      setForm({
        full_name: "",
        username: "",
        bio: "",
        location: "",
        avatar_url: "",
        skills_teach: "",
        skills_learn: "",
        languages: "",
      });
      setPage("login");
    } catch (err) {
      console.error("Logout error:", err);
      showError("Logout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOGIN
  ========================= */

  async function handleLogin(event) {
    event.preventDefault();

    const email = loginEmail.trim();

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    if (!loginPassword) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoginLoading(true);
      setError("");
      setMessage("");

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password: loginPassword,
        });

      if (loginError) {
        throw loginError;
      }

      setSession(data.session);

      if (data.session?.user?.id) {
        await loadUserData(data.session.user.id);
      }

      setPage("discover");
      setLoginPassword("");
      showMessage("Welcome back to SkillSwap!");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err?.message || "Login failed. Please check your email and password."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignUp(event) {
    event.preventDefault();

    const email = loginEmail.trim();
    const name = signUpName.trim();
    const username = signUpUsername.trim();

    if (!name) {
      setError("Please enter your full name.");
      return;
    }
    if (!username) {
      setError("Please choose a username.");
      return;
    }
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoginLoading(true);
      setError("");
      setMessage("");

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: loginPassword,
        options: {
          data: { full_name: name, username },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data?.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: name,
          name: name,
          username: username,
          email: email,
          bio: "",
          skills_teach: [],
          skills_learn: [],
          teach_skills: [],
          learn_skills: [],
        }, { onConflict: "id" });
      }

      if (data?.session) {
        setSession(data.session);
        setPage("discover");
        await loadUserData(data.session.user.id);
        showMessage("Welcome to SkillSwap!");
      } else {
        setMessage("Account created! Please check your email to verify, then sign in.");
        setIsSignUp(false);
      }

      setLoginPassword("");
      setSignUpName("");
      setSignUpUsername("");
    } catch (err) {
      console.error("Sign up error:", err);
      setError(err?.message || "Sign up failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  /* =========================
     DATA LOADING
  ========================= */

  async function loadUserData(userId) {
    if (!userId) return;
    await Promise.all([
      loadProfile(userId),
      loadDiscoverProfiles(userId),
      loadConnections(userId),
      loadRecentMessages(userId),
      loadConversations(userId),
      loadTeachingSessions(userId),
      loadPointHistory(userId),
      loadLearningSessions(userId),
    ]);
    subscribeToPresence(userId);
    initializeNotifications(userId);
  }

  /* =========================
     PUSH NOTIFICATIONS
  ========================= */

  async function initializeNotifications(userId) {
    if (notificationInitializedRef.current) return;
    notificationInitializedRef.current = true;

    try {
      await registerDeviceToken(userId);
    } catch (err) {
      console.warn("Push notification registration failed:", err);
    }

    listenForForegroundMessages((payload) => {
      const data = payload.data || {};
      handleForegroundNotification(data);
    });

    window.addEventListener("message", (event) => {
      if (event.data?.type === "NOTIFICATION_CLICKED") {
        handleNotificationClick(event.data.data);
      }
    });

    if (window.location.search.includes("notification=true")) {
      const params = new URLSearchParams(window.location.search);
      const notifData = {
        type: params.get("type"),
        conversationId: params.get("conversationId"),
        callId: params.get("callId"),
        callerId: params.get("callerId"),
        requestId: params.get("requestId"),
        sessionId: params.get("sessionId"),
        senderId: params.get("senderId"),
      };
      handleNotificationClick(notifData);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  function handleForegroundNotification(data) {
    const senderName = data.senderName || "Someone";

    if (data.type === "chat_message") {
      if (
        activeChatUser &&
        (data.senderId === activeChatUser.id || data.senderId === session?.user?.id)
      ) {
        return;
      }
      showMessage(`💬 ${senderName}: ${data.body || "New message"}`);
    } else if (data.type === "incoming_call") {
      showMessage(`📞 Incoming call from ${senderName}`);
    } else if (data.type === "session_request") {
      showMessage(`📅 New session request from ${senderName}`);
    } else if (data.type === "session_accepted") {
      showMessage(`✅ ${senderName} accepted your session request`);
    } else {
      showMessage(data.body || "New notification");
    }
  }

  function handleNotificationClick(data) {
    if (!data || !data.type) return;

    if (data.type === "chat_message" && data.conversationId) {
      const senderId = data.senderId;
      if (senderId) {
        const person = findPerson(senderId);
        if (person) {
          openChat(person);
        } else {
          setPage("chat");
        }
      } else {
        setPage("chat");
      }
    } else if (data.type === "incoming_call") {
      setPage("chat");
    } else if (data.type === "session_request") {
      setPage("sessions");
    } else if (data.type === "session_accepted") {
      setPage("sessions");
    }
  }

  async function loadProfile(userId) {
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error loading profile:", profileError);
      return;
    }

    if (data) {
      setProfile(data);
      setSkillPoints(data.skill_points || 0);

      setForm({
        full_name: data.full_name || data.name || "",
        username: data.username || "",
        bio: data.bio || "",
        location: data.location || "",
        avatar_url: data.avatar_url || "",
        skills_teach: formatSkillsForInput(
          data.skills_teach || data.teach_skills || data.can_teach || data.teaches
        ),
        skills_learn: formatSkillsForInput(
          data.skills_learn || data.learn_skills || data.wants_to_learn
        ),
        languages: formatSkillsForInput(data.languages),
        experience: data.experience || "",
        availability: data.availability || "",
        privacy_settings: data.privacy_settings || {
          show_location: true,
          show_bio: true,
          show_skills: true,
          show_reviews: true,
          show_stats: true,
          show_availability: true,
        },
      });
    }
  }

  async function loadDiscoverProfiles(userId) {
    try {
      setLoadingProfiles(true);

      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (userId) {
        query = query.neq("id", userId);
      }

      const { data, error: profilesError } = await query;

      if (profilesError) {
        console.error("Error loading discover profiles:", profilesError);
      }

      const loaded = data || [];
      setProfiles(loaded);
    } finally {
      setLoadingProfiles(false);
    }
  }

  async function loadConnections(userId) {
    const { data, error: connectionError } = await supabase
      .from("connections")
      .select("*")
      .or(
        `sender_id.eq.${userId},receiver_id.eq.${userId},requester_id.eq.${userId},recipient_id.eq.${userId}`
      )
      .order("created_at", {
        ascending: false,
      });

    if (connectionError) {
      console.warn("Connections error:", connectionError.message);
      setConnections([]);
      return;
    }

    setConnections(data || []);
  }

  async function loadRecentMessages(userId) {
    if (!userId) return;
    try {
      const { data, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (!msgErr && data) {
        setRecentMessages(data);
      }
    } catch (err) {
      console.warn("Could not load recent messages:", err);
    }
  }

  /* =========================
     CONVERSATION MANAGEMENT
  ========================= */

  async function loadConversations(userId) {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (!error && data) {
        setDbConversations(data);
      }
    } catch (err) {
      console.warn("Could not load conversations:", err);
    }
  }

  async function getOrCreateConversation(otherUserId) {
    if (!session?.user?.id || !otherUserId) return null;
    try {
      const { data, error } = await supabase.rpc("get_or_create_conversation", {
        p_other_user_id: otherUserId,
      });
      if (error) {
        console.warn("get_or_create_conversation RPC error:", error.message);
        return null;
      }
      if (data?.error) {
        console.warn("Conversation error:", data.error);
        return null;
      }
      return data;
    } catch (err) {
      console.warn("get_or_create_conversation failed:", err?.message);
      return null;
    }
  }

  async function markConversationSeen(conversationId) {
    if (!conversationId) return;
    try {
      await supabase.rpc("mark_conversation_seen", {
        p_conversation_id: conversationId,
      });
    } catch (err) {
      console.warn("mark_conversation_seen error:", err?.message);
    }
  }

  async function markMessagesDelivered(conversationId) {
    if (!conversationId) return;
    try {
      await supabase.rpc("mark_messages_delivered", {
        p_conversation_id: conversationId,
      });
    } catch (err) {
      console.warn("mark_messages_delivered error:", err?.message);
    }
  }

  async function addReaction(messageId, emoji) {
    if (!messageId || String(messageId).startsWith("temp-") || !session?.user?.id) return;
    setShowReactionPicker(null);

    const myId = session.user.id;

    // Read current state inside the updater to avoid stale closures
    let currentReactions = {};
    let msgFound = false;

    setChatMessages((prev) => {
      const msg = prev.find((m) => m.id === messageId);
      if (!msg) return prev;
      msgFound = true;
      currentReactions = msg.reactions || {};
      return prev;
    });

    if (!msgFound) return;

    const existingUsers = currentReactions[emoji] || [];
    const hasReacted = existingUsers.includes(myId);

    let newReactions;
    if (hasReacted) {
      const filtered = existingUsers.filter((uid) => uid !== myId);
      if (filtered.length === 0) {
        newReactions = Object.fromEntries(
          Object.entries(currentReactions).filter(([key]) => key !== emoji)
        );
      } else {
        newReactions = { ...currentReactions, [emoji]: filtered };
      }
    } else {
      newReactions = { ...currentReactions, [emoji]: [...existingUsers, myId] };
    }

    // Optimistic update
    setChatMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: { ...newReactions } } : m))
    );

    try {
      const { data, error } = await supabase
        .from("messages")
        .update({ reactions: newReactions }, { onConflict: "id" })
        .eq("id", messageId)
        .select()
        .single();
      if (error) {
        console.error("Reaction update error:", error);
        // Rollback
        setChatMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: { ...currentReactions } } : m))
        );
      } else if (data) {
        // Use server response to ensure consistency
        setChatMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions || newReactions } : m))
        );
      }
    } catch (err) {
      console.error("Reaction error:", err);
      setChatMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: { ...currentReactions } } : m))
      );
    }
  }

  function startReply(msg) {
    const senderName = msg.sender_id === session?.user?.id
      ? "You"
      : getName(activeChatUser);
    setReplyTo({
      id: msg.id,
      content: msg.content,
      sender_name: senderName,
    });
  }

  function resetReply() {
    setReplyTo(null);
  }

  function broadcastTyping(isTyping) {
    if (!typingChannelRef.current || !activeChatUser?.id) return;
    const now = Date.now();
    if (isTyping && now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;

    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: session?.user?.id,
        isTyping,
        conversationId: activeConversationId,
      },
    });
  }

  /* ─── Message Action Menu (Long Press / Right Click) ─── */

  function handleLongPressStart(e, msg) {
    if (msg.sending || String(msg.id).startsWith("temp-")) return;
    longPressMovedRef.current = false;
    const timer = setTimeout(() => {
      if (!longPressMovedRef.current) {
        e.preventDefault();
        showMessageMenuForMsg(msg, e);
      }
    }, 500);
    longPressTimerRef.current = timer;
  }

  function handleLongPressMove() {
    longPressMovedRef.current = true;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleLongPressEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function showMessageMenuForMsg(msg, e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 280;
    const menuWidth = 220;
    let top = rect.top - menuHeight - 8;
    let left = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || (rect.left + rect.width / 2);

    if (top < 8) top = rect.bottom + 8;
    if (top + menuHeight > window.innerHeight - 8) top = window.innerHeight - menuHeight - 8;
    if (left + menuWidth / 2 > window.innerWidth - 16) left = window.innerWidth - menuWidth / 2 - 16;
    if (left - menuWidth / 2 < 16) left = menuWidth / 2 + 16;

    setSelectedMessage(msg);
    setMenuPosition({ top, left });
    setShowMessageMenu(true);
  }

  function closeMessageMenu() {
    setShowMessageMenu(false);
    setSelectedMessage(null);
  }

  /* ─── Conversation Context Menu ─── */

  function handleConvLongPressStart(e, partner) {
    convLongPressRef.current = setTimeout(() => {
      showConvContextMenu(partner, e);
    }, 500);
  }

  function handleConvLongPressEnd() {
    if (convLongPressRef.current) {
      clearTimeout(convLongPressRef.current);
      convLongPressRef.current = null;
    }
  }

  function showConvContextMenu(partner, e) {
    const rect = e.currentTarget.getBoundingClientRect();
    let top = rect.top - 120;
    let left = e.clientX || (rect.left + rect.width / 2);
    if (top < 8) top = rect.bottom + 8;
    if (left + 160 > window.innerWidth - 16) left = window.innerWidth - 176;
    if (left - 160 < 16) left = 176;
    setConvMenuTarget(partner);
    setConvMenuPos({ top, left });
    setShowConvMenu(true);
  }

  function closeConvMenu() {
    setShowConvMenu(false);
    setConvMenuTarget(null);
  }

  async function clearConversation(partner) {
    if (!partner || !session?.user?.id) return;
    const myId = session.user.id;

    setChatMessages((prev) => prev.filter((m) => {
      const isWithPartner = (m.sender_id === myId && m.receiver_id === partner.id) ||
        (m.sender_id === partner.id && m.receiver_id === myId);
      return !isWithPartner;
    }));
    setRecentMessages((prev) => prev.filter((m) => {
      return !(
        (m.sender_id === myId && m.receiver_id === partner.id) ||
        (m.sender_id === partner.id && m.receiver_id === myId)
      );
    }));
    closeConvMenu();

    try {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, hidden_by")
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${myId})`);

      if (msgs && msgs.length > 0) {
        for (const m of msgs) {
          let val = m.hidden_by || "";
          if (!val.includes(myId)) {
            val = val ? val + "," + myId : myId;
            await supabase
              .from("messages")
              .update({ hidden_by: val })
              .eq("id", m.id)
              .catch(() => {});
          }
        }
      }

      showMessage("Conversation cleared");
      setTimeout(() => showMessage(""), 2000);
      loadConversations(myId);
    } catch (err) {
      console.error("Clear conversation error:", err);
    }
  }

  async function copyMessage(msg) {
    const text = msg.content?.startsWith("[image:") ? "[Image]"
      : msg.content?.startsWith("[video:") ? "[Video]"
      : msg.content?.startsWith("[voice:") ? "[Voice message]"
      : msg.content || "";
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard");
      setTimeout(() => setMessage(""), 2000);
    } catch {
      setMessage("Could not copy");
      setTimeout(() => setMessage(""), 2000);
    }
    closeMessageMenu();
  }

  async function deleteForMe(msg) {
    if (!msg.id || String(msg.id).startsWith("temp-")) return;
    const myId = session?.user?.id;
    if (!myId) return;

    setChatMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setRecentMessages((prev) => prev.filter((m) => m.id !== msg.id));
    closeMessageMenu();

    try {
      const { data: current } = await supabase
        .from("messages")
        .select("hidden_by")
        .eq("id", msg.id)
        .maybeSingle();

      let val = current?.hidden_by || "";
      if (!val.includes(myId)) {
        val = val ? val + "," + myId : myId;
      }

      const { error } = await supabase
        .from("messages")
        .update({ hidden_by: val })
        .eq("id", msg.id);

      if (error) console.error("deleteForMe error:", error.message, error.hint);
      showMessage("Message deleted");
      setTimeout(() => showMessage(""), 2000);
      if (session?.user?.id) loadConversations(session.user.id);
    } catch (err) {
      console.error("deleteForMe error:", err);
    }
  }

  async function unsendMsg(msg) {
    if (!msg.id || String(msg.id).startsWith("temp-")) return;

    setChatMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setRecentMessages((prev) => prev.filter((m) => m.id !== msg.id));
    closeMessageMenu();

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", msg.id);

      if (error) console.error("unsendMsg error:", error.message, error.hint);
      showMessage("Message unsent");
      setTimeout(() => showMessage(""), 2000);
      if (session?.user?.id) loadConversations(session.user.id);
    } catch (err) {
      console.error("unsendMsg error:", err);
    }
  }

  /* ─── Voice Recording ─── */

  function startWaveform(stream) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      function draw() {
        analyser.getByteFrequencyData(dataArray);
        const bars = [];
        for (let i = 0; i < 30; i++) {
          const val = dataArray[i % dataArray.length] / 255;
          bars.push(Math.max(0.1, val));
        }
        setWaveformData(bars);
        animFrameRef.current = requestAnimationFrame(draw);
      }
      draw();
    } catch (e) {
      // Waveform not critical, continue without it
    }
  }

  function stopWaveform() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setWaveformData(new Array(30).fill(0.1));
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const chunks = audioChunksRef.current;
        const finalDuration = recordingTimeRef.current || 1;
        stopWaveform();
        cleanupRecording();
        console.log("Recording stopped, chunks:", chunks.length, "duration:", finalDuration, "wasRecording:", isRecordingRef.current);
        if (chunks.length > 0 && isRecordingRef.current) {
          sendVoiceMessage(chunks, finalDuration);
        } else {
          console.warn("Voice recording: no chunks or not recording");
        }
        isRecordingRef.current = false;
        recordingTimeRef.current = 0;
      };

      recorder.start();
      isRecordingRef.current = true;
      recordingTimeRef.current = 0;
      setIsRecording(true);
      setRecordingTime(0);
      startWaveform(stream);
      recordingIntervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        showError("Microphone permission is required to record a voice message.");
      } else {
        showError("Could not access microphone: " + (err?.message || "Please try again."));
      }
    }
  }

  function stopRecording(send = true) {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (!send) {
        audioChunksRef.current = [];
      }
      mediaRecorderRef.current.stop();
    }
    stopWaveform();
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  }

  function cancelRecording() {
    isRecordingRef.current = false;
    recordingTimeRef.current = 0;
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopWaveform();
    cleanupRecording();
    setIsRecording(false);
    setRecordingTime(0);
  }

  function cleanupRecording() {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    mediaRecorderRef.current = null;
  }

  async function sendVoiceMessage(chunks, duration = 1) {
    if (!session?.user?.id || !activeChatUser?.id) {
      console.warn("Voice message: missing user or chat partner");
      return;
    }
    try {
      setSendingMessage(true);
      const blob = new Blob(chunks, { type: "audio/webm" });
      const fileExt = "webm";
      const filePath = `voice-messages/${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("voice-messages").upload(filePath, blob);
      if (uploadError) {
        console.error("Voice upload error:", uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("voice-messages").getPublicUrl(filePath);
      const voiceUrl = urlData?.publicUrl || "";

      const content = `[voice:${voiceUrl}]`;

      const tempId = "temp-voice-" + Date.now();
      const optimisticMsg = {
        id: tempId,
        sender_id: session.user.id,
        receiver_id: activeChatUser.id,
        content,
        message_type: "voice",
        media_url: voiceUrl,
        duration,
        created_at: new Date().toISOString(),
        status: "sent",
        sending: true,
        reactions: {},
      };
      setChatMessages((prev) => [...prev, optimisticMsg]);

      const connection = connectionFor(activeChatUser.id);
      const payload = {
        sender_id: session.user.id,
        receiver_id: activeChatUser.id,
        content,
        message_type: "voice",
        media_url: voiceUrl,
        duration,
        status: "sent",
        reactions: {},
      };
      if (activeConversationId) payload.conversation_id = activeConversationId;
      if (connection?.id) payload.connection_id = connection.id;

      const { data, error: sendError } = await supabase
        .from("messages").insert(payload).select().single();
      if (sendError) {
        console.error("Voice message insert error:", sendError);
        throw sendError;
      }

      setChatMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? data || { ...msg, sending: false } : msg))
      );
      await loadRecentMessages(session.user.id);
      loadConversations(session.user.id);

      sendPushNotification(activeChatUser.id, {
        title: getName(profile),
        body: "🎤 Voice message",
        type: "chat_message",
        conversationId: activeConversationId || "",
        senderId: session.user.id,
        senderName: getName(profile),
        tag: `chat-${session.user.id}`,
      }).catch(() => {});
    } catch (err) {
      console.error("Voice send failed:", err);
      showError("Could not send voice message: " + (err?.message || "Please try again."));
      setChatMessages((prev) => prev.filter((msg) => !String(msg.id).startsWith("temp-voice-")));
    } finally {
      setSendingMessage(false);
    }
  }

  /* ─── Voice Playback ─── */

  function toggleVoicePlayback(msg) {
    const url = msg.media_url;
    if (!url) {
      console.warn("Voice message has no URL");
      return;
    }

    // Stop any currently playing audio
    if (playingVoiceId === msg.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";

    audio.oncanplay = () => {
      audio.play().catch((err) => {
        console.error("Voice play error:", err);
        setPlayingVoiceId(null);
        audioPlayerRef.current = null;
      });
    };

    audio.ontimeupdate = () => {
      setVoiceProgress((prev) => ({
        ...prev,
        [msg.id]: audio.duration ? (audio.currentTime / audio.duration) * 100 : 0,
      }));
    };

    audio.onended = () => {
      setPlayingVoiceId(null);
      setVoiceProgress((prev) => ({ ...prev, [msg.id]: 100 }));
      audioPlayerRef.current = null;
    };

    audio.onerror = (e) => {
      console.error("Voice audio error:", e, "URL:", url);
      setPlayingVoiceId(null);
      audioPlayerRef.current = null;
      showError("Could not play voice message. The file may not be accessible.");
    };

    audioPlayerRef.current = audio;
    setPlayingVoiceId(msg.id);
    setVoiceProgress((prev) => ({ ...prev, [msg.id]: 0 }));
    audio.src = url;
  }

  function formatRecordingTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function formatVoiceDuration(secs) {
    if (!secs) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function subscribeToPresence(userId) {
    if (!userId) return;
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    const channel = supabase.channel("online-status-" + userId);
    presenceChannelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const online = new Set();
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p.user_id) online.add(p.user_id);
          });
        });
        setOnlineUsers(online);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          newPresences.forEach((p) => {
            if (p.user_id) next.add(p.user_id);
          });
          return next;
        });
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          leftPresences.forEach((p) => {
            if (p.user_id) next.delete(p.user_id);
          });
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });
  }

  /* =========================
     TEACHING SESSIONS & POINTS
  ========================= */

  async function loadTeachingSessions(userId) {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("teaching_sessions")
        .select("*")
        .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTeachingSessions(data);
      }
    } catch (err) {
      // Table may not exist yet — silently ignore
      console.warn("Could not load teaching sessions:", err?.message);
    }
  }

  async function loadPointHistory(userId) {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setPointHistory(data);
      }
    } catch (err) {
      console.warn("Could not load point history:", err?.message);
    }
  }

  async function createTeachingSession(learnerId, skill) {
    if (!session?.user?.id || !learnerId || !skill) return;
    try {
      setCreatingSession(true);
      const { data, error } = await supabase
        .from("teaching_sessions")
        .insert({
          teacher_id: session.user.id,
          learner_id: learnerId,
          skill: skill.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setTeachingSessions((prev) => [data, ...prev]);
      setShowSessionForm(false);
      setSessionSkillInput("");
      showMessage(
        `Teaching session for "${skill}" started! Both of you need to confirm completion to earn +10 Skill Points.`
      );
      return data;
    } catch (err) {
      console.error("Create session error:", err);
      if (err?.code === "42P01" || err?.message?.includes("does not exist")) {
        showError(
          "teaching_sessions table not found: " + (err?.message || "Run supabase_setup.sql")
        );
      } else {
        showError(err?.message || "Could not create teaching session.");
      }
    } finally {
      setCreatingSession(false);
    }
  }

  async function markSessionComplete(sessionId) {
    if (!session?.user?.id || !sessionId || completingSession) return;
    try {
      setCompletingSession(true);
      const { data, error } = await supabase.rpc("complete_teaching_session", {
        p_session_id: sessionId,
        p_user_id: session.user.id,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      // Always reload sessions after confirmation
      await loadTeachingSessions(session.user.id);

      if (result?.reward_given) {
        // Increment points locally for instant feedback
        addPoints(10, "Completed teaching session");
        // Reload the full history from DB
        await loadPointHistory(session.user.id);
        // Also reload profile to sync server-side skill_points
        await loadProfile(session.user.id);
        fireRewardToast("🎉 Teaching completed! You earned +10 Skill Points.");
      } else {
        showMessage(
          result?.message || "Confirmation saved. Waiting for both sides to confirm."
        );
      }
    } catch (err) {
      console.error("Mark complete error:", err);
      if (err?.code === "42P01" || err?.message?.includes("does not exist")) {
        showError(
          "Points system not set up: " + (err?.message || "table or function missing")
        );
      } else {
        showError(err?.message || "Could not mark session as complete.");
      }
    } finally {
      setCompletingSession(false);
    }
  }

  async function confirmTeachingComplete(sessionId) {
    if (!session?.user?.id || !sessionId || completingSession) return;
    try {
      setCompletingSession(true);
      const { data, error } = await supabase.rpc("complete_teaching_session", {
        p_session_id: sessionId,
        p_user_id: session.user.id,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      await loadTeachingSessions(session.user.id);

      if (result?.reward_given) {
        addPoints(10, "Completed teaching session");
        await loadPointHistory(session.user.id);
        await loadProfile(session.user.id);
        fireRewardToast("🎉 Teaching confirmed! +10 Skill Points awarded to the teacher.");
      } else {
        showMessage(
          result?.message || "Confirmation saved. Waiting for both sides to confirm."
        );
      }
    } catch (err) {
      console.error("Confirm session error:", err);
      showError(err?.message || "Could not confirm session.");
    } finally {
      setCompletingSession(false);
    }
  }

  /* =========================
     VOICE & VIDEO CALLING (WebRTC)
  ========================= */

  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  function getSignalingChannel(userId, otherUserId) {
    const pairId = [userId, otherUserId].sort().join("-");
    return supabase.channel("call-signal-" + pairId);
  }

  async function requestMediaPermissions(isVideo) {
    try {
      const constraints = {
        audio: true,
        video: isVideo ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Media permission error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCallError(
          isVideo
            ? "Camera and microphone permissions are required for video calls."
            : "Microphone permission is required for voice calls."
        );
      } else if (err.name === "NotFoundError") {
        setCallError(
          isVideo
            ? "No camera found. Camera is required for video calls."
            : "No microphone found. Microphone is required for voice calls."
        );
      } else {
        setCallError("Could not access media devices: " + err.message);
      }
      return null;
    }
  }

  function createPeerConnection(isInitiator, remoteUserId) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const channel = getSignalingChannel(session.user.id, remoteUserId);
        channel.send({
          type: "broadcast",
          event: "call-signal",
          payload: { type: "ice-candidate", candidate: event.candidate, callerId: session.user.id },
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState((prev) => (prev ? { ...prev, status: "connected" } : prev));
        startCallTimer();
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        endCall("ended");
      }
    };

    return pc;
  }

  function startCallTimer() {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }

  function stopCallTimer() {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }

  const missedCallTimerRef = useRef(null);

  async function startCall(callType) {
    if (!session?.user?.id || !activeChatUser?.id) return;
    if (callState || incomingCall) return;
    setCallError("");

    const stream = await requestMediaPermissions(callType === "video");
    if (!stream) return;

    try {
      const { data, error } = await supabase
        .from("calls")
        .insert({
          caller_id: session.user.id,
          receiver_id: activeChatUser.id,
          call_type: callType,
          status: "calling",
        })
        .select()
        .single();

      if (error) throw error;

      setCallState({
        id: data.id,
        type: callType,
        status: "calling",
        callerId: session.user.id,
        receiverId: activeChatUser.id,
        callerName: getName(profile),
      });

      const channel = getSignalingChannel(session.user.id, activeChatUser.id);
      callChannelRef.current = channel;

      channel
        .on("broadcast", { event: "call-signal" }, async (msg) => {
          const payload = msg.payload;
          if (payload.callerId === session.user.id) return;

          if (payload.type === "call-accepted") {
            setCallState((prev) => (prev ? { ...prev, status: "accepted" } : prev));
            if (missedCallTimerRef.current) {
              clearTimeout(missedCallTimerRef.current);
              missedCallTimerRef.current = null;
            }
            const pc = createPeerConnection(false, payload.callerId);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: "broadcast",
                event: "call-signal",
                payload: { type: "offer", offer, callerId: session.user.id },
              });
            } catch (err) {
              console.error("Error creating offer:", err);
            }
          } else if (payload.type === "offer") {
            const pc = createPeerConnection(false, payload.callerId);
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({
                type: "broadcast",
                event: "call-signal",
                payload: { type: "answer", answer, callerId: session.user.id },
              });
            } catch (err) {
              console.error("Error handling offer:", err);
            }
          } else if (payload.type === "answer") {
            const pc = peerConnectionRef.current;
            if (pc) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              } catch (err) {
                console.error("Error handling answer:", err);
              }
            }
          } else if (payload.type === "ice-candidate") {
            const pc = peerConnectionRef.current;
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (err) {
                console.error("Error adding ICE candidate:", err);
              }
            }
          } else if (payload.type === "call-declined" || payload.type === "call-ended") {
            if (missedCallTimerRef.current) {
              clearTimeout(missedCallTimerRef.current);
              missedCallTimerRef.current = null;
            }
            endCall(payload.type === "call-declined" ? "declined" : "ended");
          }
        })
        .subscribe();

      const incomingChannel = supabase.channel("incoming-call-" + activeChatUser.id);
      await incomingChannel.send({
        type: "broadcast",
        event: "call-signal",
        payload: {
          type: "call-initiate",
          callId: data.id,
          callType: callType,
          callerId: session.user.id,
        },
      });

      sendPushNotification(activeChatUser.id, {
        title: "Incoming call",
        body: `${getName(profile)} is calling you`,
        type: "incoming_call",
        callId: data.id,
        callerId: session.user.id,
        senderName: getName(profile),
        tag: `call-${data.id}`,
      }).catch(() => {});

      missedCallTimerRef.current = setTimeout(() => {
        missedCallTimerRef.current = null;
        setCallState((prev) => {
          if (prev && prev.status === "calling") {
            endCall("missed");
          }
          return prev;
        });
      }, 30000);
    } catch (err) {
      console.error("Start call error:", err);
      showError("Could not start call: " + (err?.message || "Please try again."));
      cleanupCall();
    }
  }

  async function acceptCall() {
    if (!incomingCall) return;
    setCallError("");

    const stream = await requestMediaPermissions(incomingCall.type === "video");
    if (!stream) return;

    const savedIncoming = { ...incomingCall };

    setCallState({
      id: savedIncoming.id,
      type: savedIncoming.type,
      status: "accepted",
      callerId: savedIncoming.callerId,
      receiverId: session.user.id,
      callerName: savedIncoming.callerName,
    });
    setIncomingCall(null);

    try {
      supabase
        .from("calls")
        .update({ status: "accepted", answered_at: new Date().toISOString() })
        .eq("id", savedIncoming.id)
        .then(({ error }) => { if (error) console.warn("Call update error:", error); });

      const channel = getSignalingChannel(savedIncoming.callerId, session.user.id);
      callChannelRef.current = channel;

      channel
        .on("broadcast", { event: "call-signal" }, async (msg) => {
          const payload = msg.payload;
          if (payload.callerId === session.user.id) return;

          if (payload.type === "offer") {
            const pc = createPeerConnection(false, payload.callerId);
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({
                type: "broadcast",
                event: "call-signal",
                payload: { type: "answer", answer, callerId: session.user.id },
              });
            } catch (err) {
              console.error("Error handling offer:", err);
            }
          } else if (payload.type === "answer") {
            const pc = peerConnectionRef.current;
            if (pc) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              } catch (err) {
                console.error("Error handling answer:", err);
              }
            }
          } else if (payload.type === "ice-candidate") {
            const pc = peerConnectionRef.current;
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (err) {
                console.error("Error adding ICE candidate:", err);
              }
            }
          } else if (payload.type === "call-ended" || payload.type === "call-declined") {
            endCall(payload.type === "call-declined" ? "declined" : "ended");
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            channel.send({
              type: "broadcast",
              event: "call-signal",
              payload: { type: "call-accepted", callerId: session.user.id },
            });
          }
        });
    } catch (err) {
      console.error("Accept call error:", err);
      showError("Could not accept call: " + (err?.message || "Please try again."));
      cleanupCall();
    }
  }

  async function declineCall() {
    if (!incomingCall) return;

    try {
      supabase
        .from("calls")
        .update({ status: "declined", ended_at: new Date().toISOString() })
        .eq("id", incomingCall.id)
        .then(({ error }) => { if (error) console.warn("Decline DB error:", error); });

      const channel = getSignalingChannel(incomingCall.callerId, session.user.id);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "call-signal",
            payload: { type: "call-declined", callerId: session.user.id },
          });
          setTimeout(() => supabase.removeChannel(channel), 1000);
        }
      });
    } catch (err) {
      console.error("Decline call error:", err);
    }

    setIncomingCall(null);
  }

  async function endCall(status = "ended") {
    const currentCall = callState;
    stopCallTimer();
    if (missedCallTimerRef.current) {
      clearTimeout(missedCallTimerRef.current);
      missedCallTimerRef.current = null;
    }

    if (currentCall?.id) {
      try {
        const update = { status, ended_at: new Date().toISOString() };
        if (currentCall.status === "connected" || currentCall.status === "accepted") {
          update.duration = callDuration;
        }
        supabase.from("calls").update(update).eq("id", currentCall.id)
          .then(({ error }) => { if (error) console.warn("End call DB error:", error); });
      } catch (err) {
        console.error("End call DB error:", err);
      }
    }

    if (callChannelRef.current && currentCall) {
      const otherUserId =
        currentCall.callerId === session.user.id
          ? currentCall.receiverId
          : currentCall.callerId;
      try {
        callChannelRef.current.send({
          type: "broadcast",
          event: "call-signal",
          payload: { type: "call-ended", callerId: session.user.id },
        });
      } catch (err) {
        console.error("End call signal error:", err);
      }
      try {
        const incomingChannel = supabase.channel("incoming-call-" + otherUserId);
        incomingChannel.subscribe(async (s) => {
          if (s === "SUBSCRIBED") {
            await incomingChannel.send({
              type: "broadcast",
              event: "call-signal",
              payload: { type: "call-ended", callerId: session.user.id },
            });
            setTimeout(() => supabase.removeChannel(incomingChannel), 1000);
          }
        });
      } catch (err) {}
    }

    if (status !== "missed" && status !== "declined" && currentCall?.id) {
      try {
        const callTypeLabel = currentCall.type === "video" ? "🎥 Video call" : "📞 Voice call";
        const durationStr = callDuration > 0 ? ` — ${formatCallDuration(callDuration)}` : "";
        const otherUserId = currentCall.callerId === session.user.id
          ? currentCall.receiverId
          : currentCall.callerId;
        const conv = dbConversations.find(c =>
          (c.user1_id === session.user.id && c.user2_id === otherUserId) ||
          (c.user2_id === session.user.id && c.user1_id === otherUserId)
        );
        await supabase.from("messages").insert({
          sender_id: session.user.id,
          receiver_id: otherUserId,
          content: `${callTypeLabel}${durationStr}`,
          conversation_id: conv?.id || null,
        });
      } catch (err) {
        console.error("Call history message error:", err);
      }
    }

    cleanupCall();
  }

  function cleanupCall() {
    stopCallTimer();
    if (missedCallTimerRef.current) {
      clearTimeout(missedCallTimerRef.current);
      missedCallTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState(null);
    setIncomingCall(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(true);
    setIsCameraOn(true);
    setCallError("");
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }

  function toggleCamera() {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }

  function toggleSpeaker() {
    setIsSpeakerOn((prev) => !prev);
  }

  function formatCallDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    const myId = session.user.id;

    const channel = supabase
      .channel("incoming-call-" + myId)
      .on("broadcast", { event: "call-signal" }, async (msg) => {
        const payload = msg.payload;
        if (payload.callerId === myId) return;

        if (payload.type === "call-initiate") {
          let caller = findPerson(payload.callerId);
          if (!caller) {
            try {
              const { data } = await supabase.from("profiles").select("*").eq("id", payload.callerId).maybeSingle();
              if (data) caller = data;
            } catch (e) {}
          }
          setIncomingCall({
            id: payload.callId,
            type: payload.callType,
            callerId: payload.callerId,
            callerName: caller ? getName(caller) : "Someone",
          });
        } else if (payload.type === "call-ended" || payload.type === "call-declined") {
          setIncomingCall(null);
          setCallState((prev) => {
            if (prev) {
              cleanupCall();
            }
            return null;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, []);

  useEffect(() => {
    if (callState && localStreamRef.current && localVideoRef.current && !localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [callState]);

  function fireRewardToast(msg) {
    setRewardToastMsg(msg);
    setShowRewardToast(true);
    setTimeout(() => setShowRewardToast(false), 6000);
  }

  /* =========================
     MESSAGES & REALTIME CHAT (STABLE)
  ========================= */

  async function loadChatMessages(otherUserId, isInitial = false) {
    if (!session?.user?.id || !otherUserId) return;
    const myId = session.user.id;

    try {
      if (isInitial) {
        setLoadingChat(true);
      }

      const { data, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myId})`
        )
        .order("created_at", { ascending: true });

      if (msgErr) {
        console.error("Error loading messages:", msgErr);
      } else {
        const fetched = data || [];
        setChatMessages(fetched);
        if (activeConversationId) {
          markMessagesDelivered(activeConversationId);
        }
      }
    } catch (err) {
      console.error("Chat load error:", err);
    } finally {
      if (isInitial) {
        setLoadingChat(false);
      }
    }
  }

  // Load chat messages when activeChatUser changes
  useEffect(() => {
    if (activeChatUser?.id) {
      prevMessagesCountRef.current = 0;
      loadChatMessages(activeChatUser.id, true);
      setShowSessionForm(false);
      setSessionSkillInput("");

      // Get or create conversation
      getOrCreateConversation(activeChatUser.id).then((result) => {
        if (result?.id) {
          setActiveConversationId(result.id);
          markConversationSeen(result.id);
        }
      });

      // Subscribe to typing events for this conversation
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
      const tChannel = supabase.channel("typing-" + [session?.user?.id, activeChatUser.id].sort().join("-"));
      typingChannelRef.current = tChannel;
      tChannel
        .on("broadcast", { event: "typing" }, (msg) => {
          const payload = msg.payload;
          if (payload.userId === session?.user?.id) return;
          if (payload.isTyping) {
            setTypingUsers((prev) => ({ ...prev, [payload.userId]: true }));
            setTimeout(() => {
              setTypingUsers((prev) => {
                const next = { ...prev };
                delete next[payload.userId];
                return next;
              });
            }, 4000);
          } else {
            setTypingUsers((prev) => {
              const next = { ...prev };
              delete next[payload.userId];
              return next;
            });
          }
        })
        .subscribe();
    } else {
      setChatMessages([]);
      setActiveConversationId(null);
      setShowSessionForm(false);
      setTypingUsers({});
      setReplyTo(null);
      setShowReactionPicker(null);
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
    }
  }, [activeChatUser?.id]);

  // Realtime subscription to messages & conversation updates
  useEffect(() => {
    if (!session?.user?.id) return;
    const myId = session.user.id;

    const channel = supabase
      .channel("realtime-messages-" + myId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          // If message was hidden for current user, don't show it
          if (newMsg.hidden_by && newMsg.hidden_by.includes(myId)) return;

          // If message belongs to currently open chat
          if (
            activeChatUser &&
            ((newMsg.sender_id === activeChatUser.id && newMsg.receiver_id === myId) ||
              (newMsg.sender_id === myId && newMsg.receiver_id === activeChatUser.id))
          ) {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.receiver_id === myId && activeConversationId) {
              markMessagesDelivered(activeConversationId);
            }
          }

          // Update recent messages list
          setRecentMessages((prev) => [
            newMsg,
            ...prev.filter((m) => m.id !== newMsg.id),
          ]);

          // The unread count is updated via the conversations UPDATE event
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updatedMsg = payload.new;
          if (!updatedMsg) return;

          // If message was hidden for current user, remove from chat
          if (updatedMsg.hidden_by && updatedMsg.hidden_by.includes(myId)) {
            setChatMessages((prev) => prev.filter((m) => m.id !== updatedMsg.id));
            return;
          }

          // Update message in current chat (for reactions, status changes, unsent, etc.)
          if (
            activeChatUser &&
            ((updatedMsg.sender_id === activeChatUser.id && updatedMsg.receiver_id === myId) ||
              (updatedMsg.sender_id === myId && updatedMsg.receiver_id === activeChatUser.id))
          ) {
            setChatMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const deletedMsg = payload.old;
          if (!deletedMsg) return;

          // Remove message from current chat
          setChatMessages((prev) => prev.filter((m) => m.id !== deletedMsg.id));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const updated = payload.new;
          if (!updated) return;
          setDbConversations((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        (payload) => {
          const newConv = payload.new;
          if (!newConv) return;
          setDbConversations((prev) => {
            if (prev.some((c) => c.id === newConv.id)) return prev;
            return [newConv, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, activeChatUser?.id, activeConversationId]);

  // Scroll ONLY the chat container
  useEffect(() => {
    if (messagesContainerRef.current && chatMessages.length > 0) {
      const container = messagesContainerRef.current;
      if (chatMessages.length !== prevMessagesCountRef.current) {
        const isNewArrival = prevMessagesCountRef.current > 0;
        prevMessagesCountRef.current = chatMessages.length;

        container.scrollTo({
          top: container.scrollHeight,
          behavior: isNewArrival ? "smooth" : "auto",
        });
      }
    }
  }, [chatMessages.length]);

  // Live session timer countdown
  // Timer removed — sessions have no countdown

  useEffect(() => {
    if (activeLiveSession && liveSessionState.isCameraOn && liveLocalStreamRef.current && liveLocalVideoRef.current && !liveLocalVideoRef.current.srcObject) {
      liveLocalVideoRef.current.srcObject = liveLocalStreamRef.current;
    }
  }, [activeLiveSession, liveSessionState.isCameraOn]);

  async function handleSendMessage(customText) {
    const text = (typeof customText === "string" ? customText : messageInput).trim();
    if (!text || !session?.user?.id || !activeChatUser?.id || sendingMessage) return;

    const tempId = "temp-" + Date.now();
    const optimisticMsg = {
      id: tempId,
      sender_id: session.user.id,
      receiver_id: activeChatUser.id,
      content: text,
      created_at: new Date().toISOString(),
      status: "sent",
      sending: true,
      reply_to_id: replyTo?.id || null,
      reply_to_content: replyTo?.content || "",
      reply_to_sender_name: replyTo?.sender_name || "",
      reactions: {},
    };

    setChatMessages((prev) => [...prev, optimisticMsg]);
    setMessageInput("");
    setSendingMessage(true);
    broadcastTyping(false);
    setReplyTo(null);

    try {
      const connection = connectionFor(activeChatUser.id);
      const payload = {
        sender_id: session.user.id,
        receiver_id: activeChatUser.id,
        content: text,
        status: "sent",
        reactions: {},
      };

      if (activeConversationId) {
        payload.conversation_id = activeConversationId;
      }

      if (connection?.id) {
        payload.connection_id = connection.id;
      }

      if (replyTo?.id) {
        payload.reply_to_id = replyTo.id;
        payload.reply_to_content = replyTo.content || "";
        payload.reply_to_sender_name = replyTo.sender_name || "";
      }

      const { data, error: sendError } = await supabase
        .from("messages")
        .insert(payload)
        .select()
        .single();

      if (sendError) {
        throw sendError;
      }

      setChatMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? data || { ...msg, sending: false } : msg))
      );

      await loadRecentMessages(session.user.id);
      loadConversations(session.user.id);

      sendPushNotification(activeChatUser.id, {
        title: getName(profile),
        body: text.length > 100 ? text.substring(0, 100) + "..." : text,
        type: "chat_message",
        conversationId: activeConversationId || "",
        senderId: session.user.id,
        senderName: getName(profile),
        tag: `chat-${session.user.id}`,
      }).catch(() => {});
    } catch (err) {
      console.error("Send message error:", err);
      showError("Could not send message: " + (err?.message || "Please try again."));
      setChatMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !session?.user?.id || !activeChatUser?.id) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      showError("Please select an image or video file.");
      return;
    }

    if (isImage && file.size > 5 * 1024 * 1024) {
      showError("Image size must be under 5 MB.");
      return;
    }
    if (isVideo && file.size > 10 * 1024 * 1024) {
      showError("Video size must be under 10 MB.");
      return;
    }

    setSendingMessage(true);
    try {
      let mediaUrl = "";
      const mediaType = isImage ? "image" : "video";

      if (isImage) {
        mediaUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(file);
        });
      } else {
        const fileExt = file.name.split(".").pop();
        const filePath = `chat-media/${session.user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-media")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("chat-media")
          .getPublicUrl(filePath);
        mediaUrl = urlData?.publicUrl || "";
      }

      const content = `[${mediaType}:${mediaUrl}]`;

      const connection = connectionFor(activeChatUser.id);
      const payload = {
        sender_id: session.user.id,
        receiver_id: activeChatUser.id,
        content,
      };
      if (activeConversationId) {
        payload.conversation_id = activeConversationId;
      }
      if (connection?.id) {
        payload.connection_id = connection.id;
      }

      const { data, error: sendError } = await supabase
        .from("messages")
        .insert(payload)
        .select()
        .single();
      if (sendError) throw sendError;

      setChatMessages((prev) => [...prev, data]);
      await loadRecentMessages(session.user.id);

      sendPushNotification(activeChatUser.id, {
        title: getName(profile),
        body: isImage ? "📷 Photo" : "🎬 Video",
        type: "chat_message",
        conversationId: activeConversationId || "",
        senderId: session.user.id,
        senderName: getName(profile),
        tag: `chat-${session.user.id}`,
      }).catch(() => {});
    } catch (err) {
      console.error("File upload error:", err);
      showError("Could not send media: " + (err?.message || "Please try again."));
    } finally {
      setSendingMessage(false);
      event.target.value = "";
    }
  }

  async function handleProfileImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !session?.user?.id) return;

    if (!file.type.startsWith("image/")) {
      showError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be under 5 MB.");
      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `profile-images/${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-media")
        .getPublicUrl(filePath);

      const avatarUrl = urlData?.publicUrl || "";
      if (!avatarUrl) throw new Error("Failed to get image URL");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", session.user.id);
      if (updateError) throw updateError;

      setForm((p) => ({ ...p, avatar_url: avatarUrl }));
      setProfile((p) => (p ? { ...p, avatar_url: avatarUrl } : p));
      showMessage("Profile photo updated!");
    } catch (err) {
      console.error("Profile image upload error:", err);
      showError("Could not upload photo: " + (err?.message || "Please try again."));
    } finally {
      event.target.value = "";
    }
  }

  /* ─── Camera & Media Preview ─── */

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: cameraMode === "video",
      });
      cameraStreamRef.current = stream;
      setShowCameraModal(true);
      // Attach stream to video element after modal renders
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        showError("Camera permission is required. Please allow camera access.");
      } else if (err.name === "NotFoundError") {
        showError("No camera found on this device.");
      } else {
        // Fallback to file picker
        cameraInputRef.current?.click();
      }
    }
  }

  function closeCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setIsRecordingVideo(false);
    setShowCameraModal(false);
  }

  function capturePhoto() {
    const video = cameraVideoRef.current;
    if (!video) return;
    const canvas = cameraCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);
          setMediaPreview(url);
          setMediaPreviewFile(file);
          closeCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  }

  function toggleVideoRecording() {
    if (isRecordingVideo) {
      // Stop recording
      if (mediaRecorderRef2.current && mediaRecorderRef2.current.state !== "inactive") {
        mediaRecorderRef2.current.stop();
      }
      setIsRecordingVideo(false);
      return;
    }
    // Start recording
    const stream = cameraStreamRef.current;
    if (!stream) return;
    mediaRecorderChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef2.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) mediaRecorderChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(mediaRecorderChunksRef.current, { type: "video/webm" });
      const file = new File([blob], `video-${Date.now()}.webm`, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setMediaPreview(url);
      setMediaPreviewFile(file);
      closeCamera();
    };
    recorder.start();
    setIsRecordingVideo(true);
  }

  function handleCameraCapture(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      showError("Please capture an image or video.");
      event.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
    setMediaPreviewFile(file);
    event.target.value = "";
  }

  function handleMediaSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      showError("Please select an image or video file.");
      event.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
    setMediaPreviewFile(file);
    event.target.value = "";
  }

  async function sendMediaMessage() {
    if (!mediaPreviewFile || !session?.user?.id || !activeChatUser?.id) return;
    setSendingMessage(true);
    try {
      const file = mediaPreviewFile;
      const isImage = file.type.startsWith("image/");
      let mediaUrl = "";

      if (isImage) {
        mediaUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(file);
        });
      } else {
        const fileExt = file.name.split(".").pop();
        const filePath = `chat-media/${session.user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-media").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("chat-media").getPublicUrl(filePath);
        mediaUrl = urlData?.publicUrl || "";
      }

      const mediaType = isImage ? "image" : "video";
      const content = `[${mediaType}:${mediaUrl}]`;

      const connection = connectionFor(activeChatUser.id);
      const payload = {
        sender_id: session.user.id,
        receiver_id: activeChatUser.id,
        content,
      };
      if (activeConversationId) payload.conversation_id = activeConversationId;
      if (connection?.id) payload.connection_id = connection.id;

      const { data, error: sendError } = await supabase
        .from("messages").insert(payload).select().single();
      if (sendError) throw sendError;

      setChatMessages((prev) => [...prev, data]);
      await loadRecentMessages(session.user.id);
      loadConversations(session.user.id);
    } catch (err) {
      showError("Could not send media: " + (err?.message || "Please try again."));
    } finally {
      setSendingMessage(false);
      cancelMediaPreview();
    }
  }

  function cancelMediaPreview() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setMediaPreviewFile(null);
  }

  /* =========================
     NOTIFICATIONS
  ========================= */

  function showMessage(text) {
    setMessage(text);
    setError("");
    setTimeout(() => {
      setMessage("");
    }, 4000);
  }

  function showError(text) {
    setError(text);
    setMessage("");
    setTimeout(() => {
      setError("");
    }, 6000);
  }

  /* =========================
     PROFILE
  ========================= */

  function updateForm(field, value) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!session?.user?.id) {
      showError("You must be logged in.");
      return;
    }

    try {
      setSaving(true);

      const teachArray = splitSkills(form.skills_teach);
      const learnArray = splitSkills(form.skills_learn);
      const langArray = splitSkills(form.languages);

      const payload = {
        id: session.user.id,
        full_name: form.full_name.trim(),
        name: form.full_name.trim(),
        username: form.username.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        avatar_url: form.avatar_url.trim(),
        skills_teach: JSON.stringify(teachArray),
        skills_learn: JSON.stringify(learnArray),
        teach_skills: teachArray,
        learn_skills: learnArray,
        languages: langArray,
        experience: form.experience.trim(),
        availability: form.availability.trim(),
        privacy_settings: form.privacy_settings,
      };

      const { data, error: saveError } = await supabase
        .from("profiles")
        .upsert(payload, {
          onConflict: "id",
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      setProfile(data);
      setEditing(false);

      await loadDiscoverProfiles(session.user.id);
      showMessage("Profile saved successfully.");
    } catch (err) {
      console.error("Save profile error:", err);
      showError(err?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     CONNECTIONS
  ========================= */

  async function sendConnectionRequest(targetUserId) {
    if (!session?.user?.id) {
      showError("Please log in first.");
      return;
    }

    try {
      setSaving(true);

      const { data, error: rpcError } = await supabase.rpc(
        "send_connection_request",
        {
          target_user_id: targetUserId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.success) {
        throw new Error(result?.message || "Could not send connection request.");
      }

      await loadConnections(session.user.id);
      showMessage(result.message || "Connection request sent.");
    } catch (err) {
      console.error("Connection error:", err);
      showError(err?.message || "Could not send connection request.");
    } finally {
      setSaving(false);
    }
  }

  async function acceptConnection(connectionId) {
    try {
      setSaving(true);

      const { data, error: rpcError } = await supabase.rpc(
        "accept_connection_request",
        {
          request_id: connectionId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.success) {
        throw new Error(result?.message || "Could not accept connection.");
      }

      await loadConnections(session.user.id);
      showMessage("Connection accepted! You can now chat.");
    } catch (err) {
      console.error("Accept connection error:", err);
      showError(err?.message || "Could not accept connection.");
    } finally {
      setSaving(false);
    }
  }

  async function declineConnection(connectionId) {
    try {
      setSaving(true);

      const { data, error: rpcError } = await supabase.rpc(
        "decline_connection_request",
        {
          request_id: connectionId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.success) {
        throw new Error(result?.message || "Could not decline connection.");
      }

      await loadConnections(session.user.id);
      showMessage("Connection request declined.");
    } catch (err) {
      console.error("Decline connection error:", err);
      showError(err?.message || "Could not decline connection.");
    } finally {
      setSaving(false);
    }
  }

  function connectionFor(userId) {
    return connections.find((connection) => {
      const sender = connection.sender_id || connection.requester_id;
      const receiver = connection.receiver_id || connection.recipient_id;

      return (
        (sender === session?.user?.id && receiver === userId) ||
        (sender === userId && receiver === session?.user?.id)
      );
    });
  }

  /* =========================
     HELPERS
  ========================= */

  function getName(person) {
    return (
      person?.full_name ||
      person?.name ||
      person?.username ||
      "SkillSwap Member"
    );
  }

  function getInitial(person) {
    const name = getName(person);
    return name ? name.charAt(0).toUpperCase() : "✦";
  }

  function splitSkills(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {}

      return value
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  function formatSkillsForInput(value) {
    return splitSkills(value).join(", ");
  }

  function getTeachSkills(person) {
    return splitSkills(
      person?.skills_teach ||
        person?.teach_skills ||
        person?.can_teach ||
        person?.teaches ||
        ""
    );
  }

  function getLearnSkills(person) {
    return splitSkills(
      person?.skills_learn ||
        person?.learn_skills ||
        person?.wants_to_learn ||
        ""
    );
  }

  function formatTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  function matchPercentage(person) {
    if (!person || !profile) return 75;

    const myLearn = getLearnSkills(profile).map((x) => x.toLowerCase());
    const theirTeach = getTeachSkills(person).map((x) => x.toLowerCase());
    const myTeach = getTeachSkills(profile).map((x) => x.toLowerCase());
    const theirLearn = getLearnSkills(person).map((x) => x.toLowerCase());

    const firstMatch = myLearn.filter((skill) =>
      theirTeach.some((other) => other.includes(skill) || skill.includes(other))
    ).length;

    const secondMatch = myTeach.filter((skill) =>
      theirLearn.some((other) => other.includes(skill) || skill.includes(other))
    ).length;

    const total = firstMatch + secondMatch;

    if (total >= 4) return 96;
    if (total === 3) return 91;
    if (total === 2) return 84;
    if (total === 1) return 76;

    return 68;
  }

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return profiles;
    }

    return profiles.filter((person) => {
      const values = [
        person.full_name,
        person.name,
        person.username,
        person.bio,
        person.location,
        person.skills_teach,
        person.skills_learn,
        person.teach_skills,
        person.learn_skills,
        person.can_teach,
        person.wants_to_learn,
        person.languages,
      ];

      return values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [profiles, search]);

  function openChat(person) {
    setActiveChatUser(person);
    setPage("chat");
  }

  async function openPublicProfile(userId) {
    if (!userId) return;
    if (userId === session?.user?.id) {
      setPage("profile");
      return;
    }

    setProfileViewStack((prev) => [...prev, { page, viewingProfileId }]);
    setLoadingViewProfile(true);
    setViewingProfileId(userId);

    try {
      // Try RPC first (requires SQL migration)
      let profileData = null;
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_public_profile", {
        target_user_id: userId,
        requesting_user_id: session?.user?.id,
      });

      if (!rpcError && rpcData) {
        profileData = rpcData;
      } else {
        // Fallback: direct query
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;
        profileData = data;
      }

      if (!profileData) throw new Error("Profile not found");
      setViewingProfile(profileData);

      // Try fetching reviews
      const { data: reviewData } = await supabase.rpc("get_public_reviews", {
        target_user_id: userId,
      });
      if (reviewData) {
        setViewingProfile((prev) => prev ? { ...prev, _reviews: reviewData } : prev);
      } else {
        // Fallback: fetch reviews directly
        const { data: sessions } = await supabase
          .from("learning_sessions")
          .select("id, topic, rating, feedback, created_at")
          .or(`host_id.eq.${userId},participant_id.eq.${userId}`)
          .eq("status", "completed")
          .gt("rating", 0)
          .order("created_at", { ascending: false })
          .limit(5);

        const { count: totalSessions } = await supabase
          .from("learning_sessions")
          .select("*", { count: "exact", head: true })
          .or(`host_id.eq.${userId},participant_id.eq.${userId}`)
          .eq("status", "completed");

        const { data: ratedSessions } = await supabase
          .from("learning_sessions")
          .select("rating")
          .or(`host_id.eq.${userId},participant_id.eq.${userId}`)
          .eq("status", "completed")
          .gt("rating", 0);

        const avgRating = ratedSessions && ratedSessions.length > 0
          ? ratedSessions.reduce((sum, s) => sum + s.rating, 0) / ratedSessions.length
          : 0;

        setViewingProfile((prev) => prev ? {
          ...prev,
          _reviews: {
            stats: { total_sessions: totalSessions || 0, avg_rating: avgRating, rated_sessions: ratedSessions?.length || 0 },
            reviews: sessions || [],
          },
        } : prev);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      showError("Could not load profile.");
    } finally {
      setLoadingViewProfile(false);
    }
  }

  function closePublicProfile() {
    const stack = [...profileViewStack];
    const prev = stack.pop();
    setProfileViewStack(stack);
    setViewingProfile(null);
    setViewingProfileId(null);
    if (prev) {
      setPage(prev.page);
    }
  }

  function openPublicProfileFromProfile(userId) {
    if (!userId) return;
    if (userId === session?.user?.id) {
      setPage("profile");
      return;
    }
    setProfileViewStack((prev) => [...prev, { page: "profile", viewingProfileId: null }]);
    setLoadingViewProfile(true);
    setViewingProfileId(userId);

    supabase
      .rpc("get_public_profile", {
        target_user_id: userId,
        requesting_user_id: session?.user?.id,
      })
      .then(({ data, error }) => {
        if (!error && data) {
          setViewingProfile(data);
        } else {
          return supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        }
      })
      .then(({ data }) => {
        if (data) setViewingProfile(data);
        setLoadingViewProfile(false);
      })
      .catch(() => setLoadingViewProfile(false));
  }

  // Find user profile by ID
  function findPerson(userId) {
    if (!userId) return null;
    if (profile?.id === userId) return profile;
    return profiles.find((p) => p.id === userId) || null;
  }

  // Compute conversations list from DB conversations + connections
  const conversations = useMemo(() => {
    const myId = session?.user?.id;
    if (!myId) return [];

    const convMap = new Map();

    // 1. Add all DB conversations
    dbConversations.forEach((conv) => {
      const partnerId = conv.user1_id === myId ? conv.user2_id : conv.user1_id;
      const partnerProfile = findPerson(partnerId);
      if (!partnerProfile) return;

      convMap.set(partnerId, {
        partner: partnerProfile,
        connection: connectionFor(partnerId) || null,
        lastMessage: conv.last_message_preview ? {
          content: conv.last_message_preview,
          created_at: conv.last_message_at,
          sender_id: conv.last_message_sender_id,
        } : null,
        conversationId: conv.id,
        unreadCount: conv.user1_id === myId ? conv.user1_unread_count : conv.user2_unread_count,
        lastMessageAt: conv.last_message_at,
      });
    });

    // 2. Add accepted connections that don't have conversations yet
    connections
      .filter((c) => c.status === "accepted")
      .forEach((conn) => {
        const sender = conn.sender_id || conn.requester_id;
        const receiver = conn.receiver_id || conn.recipient_id;
        const partnerId = sender === myId ? receiver : sender;

        if (partnerId && !convMap.has(partnerId)) {
          const partnerProfile = findPerson(partnerId);
          if (!partnerProfile) return;

          convMap.set(partnerId, {
            partner: partnerProfile,
            connection: conn,
            lastMessage: null,
            conversationId: null,
            unreadCount: 0,
            lastMessageAt: conn.created_at,
          });
        }
      });

    // 3. Attach latest message from recentMessages for conversations without a lastMessage
    recentMessages.forEach((msg) => {
      const partnerId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
      if (!partnerId) return;

      const existing = convMap.get(partnerId);
      if (existing && !existing.lastMessage) {
        existing.lastMessage = msg;
        if (!existing.lastMessageAt) {
          existing.lastMessageAt = msg.created_at;
        }
      }
    });

    let convList = Array.from(convMap.values());

    // Sort by last message time or connection time
    convList.sort((a, b) => {
      const timeA = new Date(a.lastMessageAt || a.lastMessage?.created_at || a.connection?.created_at || 0).getTime();
      const timeB = new Date(b.lastMessageAt || b.lastMessage?.created_at || b.connection?.created_at || 0).getTime();
      return timeB - timeA;
    });

    // Filter by search query if any
    if (chatSearch.trim()) {
      const q = chatSearch.trim().toLowerCase();
      convList = convList.filter((c) =>
        getName(c.partner).toLowerCase().includes(q) ||
        (c.partner.username && c.partner.username.toLowerCase().includes(q))
      );
    }

    return convList;
  }, [dbConversations, connections, recentMessages, profiles, profile, session?.user?.id, chatSearch]);

  // Incoming pending requests
  const pendingIncomingRequests = useMemo(() => {
    const myId = session?.user?.id;
    if (!myId) return [];

    return connections.filter((conn) => {
      const receiver = conn.receiver_id || conn.recipient_id;
      return receiver === myId && conn.status === "pending";
    });
  }, [connections, session?.user?.id]);

  // Pending confirmations: sessions where I'm the learner and teacher marked done but I haven't confirmed
  const pendingConfirmations = useMemo(() => {
    const myId = session?.user?.id;
    if (!myId) return [];
    return teachingSessions.filter(
      (s) => s.learner_id === myId && s.teacher_done && !s.learner_done && !s.reward_given
    );
  }, [teachingSessions, session?.user?.id]);

  // All teaching sessions categorized by status
  const myTeachingSessions = useMemo(() => {
    const myId = session?.user?.id;
    if (!myId) return { active: [], waiting: [], completed: [] };

    const active = [];
    const waiting = [];
    const completed = [];

    teachingSessions.forEach((s) => {
      if (s.reward_given) {
        completed.push(s);
      } else if (s.teacher_done && !s.learner_done) {
        waiting.push(s);
      } else if (!s.teacher_done && s.learner_done) {
        waiting.push(s);
      } else {
        active.push(s);
      }
    });

    return { active, waiting, completed };
  }, [teachingSessions, session?.user?.id]);

  /* =========================
     PROFILE CARD COMPONENT
  ========================= */

  function renderProfileCard(person) {
    const connection = connectionFor(person.id);

    const sender = connection?.sender_id || connection?.requester_id;
    const receiver = connection?.receiver_id || connection?.recipient_id;
    const accepted = connection?.status === "accepted";
    const pending = connection?.status === "pending";
    const sentByMe = sender === session?.user?.id;
    const receivedByMe = receiver === session?.user?.id;

    return (
      <article className="person-card" key={person.id}>
        <div className="person-card-top">
          <div className="person-avatar clickable-avatar" onClick={() => openPublicProfile(person.id)}>
            {person.avatar_url ? (
              <img src={person.avatar_url} alt={getName(person)} />
            ) : (
              getInitial(person)
            )}
          </div>

          <div className="match-badge">
            <strong>{matchPercentage(person)}%</strong>
            <span>MATCH</span>
          </div>
        </div>

        <h3 className="clickable-name" onClick={() => openPublicProfile(person.id)}>{getName(person)}</h3>

        <div className="person-username clickable-name" onClick={() => openPublicProfile(person.id)}>@{person.username || "member"}</div>

        {person.location && <div className="location">📍 {person.location}</div>}

        {person.bio && <p className="person-bio">{person.bio}</p>}

        <div className="skills-section">
          <span className="skills-title">CAN TEACH</span>
          <div className="tags">
            {getTeachSkills(person).length > 0 ? (
              getTeachSkills(person)
                .slice(0, 5)
                .map((skill) => (
                  <span className="tag teach" key={skill}>
                    {skill}
                  </span>
                ))
            ) : (
              <span className="tag teach">General Knowledge</span>
            )}
          </div>
        </div>

        <div className="skills-section">
          <span className="skills-title">WANTS TO LEARN</span>
          <div className="tags">
            {getLearnSkills(person).length > 0 ? (
              getLearnSkills(person)
                .slice(0, 5)
                .map((skill) => (
                  <span className="tag learn" key={skill}>
                    {skill}
                  </span>
                ))
            ) : (
              <span className="tag learn">New Skills</span>
            )}
          </div>
        </div>

        {accepted ? (
          <div className="person-card-actions">
            <button
              className="connect-button profile-btn"
              onClick={() => openPublicProfile(person.id)}
            >
              <span>👤 Profile</span>
            </button>
            <button
              className="connect-button chat-btn"
              onClick={() => openChat(person)}
            >
              <span>💬 Chat now</span>
              <span>→</span>
            </button>
          </div>
        ) : receivedByMe && pending ? (
          <div className="hero-actions" style={{ marginTop: "20px" }}>
            <button
              className="primary-button"
              style={{ flex: 1 }}
              disabled={saving}
              onClick={() => acceptConnection(connection.id)}
            >
              Accept
            </button>

            <button
              className="secondary-button"
              style={{ flex: 1 }}
              disabled={saving}
              onClick={() => declineConnection(connection.id)}
            >
              Decline
            </button>
          </div>
        ) : (
          <div className="person-card-actions">
            <button
              className="connect-button profile-btn"
              onClick={() => openPublicProfile(person.id)}
            >
              <span>👤 Profile</span>
            </button>
            <button
              className="connect-button"
              disabled={saving || (pending && sentByMe)}
              onClick={() => sendConnectionRequest(person.id)}
            >
              {pending && sentByMe ? "✓ Request sent" : "Connect & Swap →"}
            </button>
          </div>
        )}
      </article>
    );
  }

  /* =========================
     DISCOVER PAGE
  ========================= */

  function renderDiscover() {
    return (
      <>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">✨ LEARN · TEACH · CONNECT</span>

            <h1>
              Exchange skills.
              <br />
              <span>Grow together.</span>
            </h1>

            <p>
              SkillSwap connects you with people who can teach what you want to
              learn — while you share the skills you already know.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() =>
                  document
                    .getElementById("discover")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Discover matches →
              </button>

              <button
                className="secondary-button"
                onClick={() => setPage("chat")}
              >
                Open Messages 💬
              </button>
            </div>

            <div className="trust-row">
              <span>✓ Free to join</span>
              <span>✓ Real-time messaging</span>
              <span>✓ Verified matches</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="glow" />

            <div className="floating-skill skill-left">
              <span>💻</span>
              <div>
                <strong>
                  {getTeachSkills(profile)[0] || "Python & AI"}
                </strong>
                <small>Can teach</small>
              </div>
            </div>

            <div className="match-card">
              <div className="match-top">
                <span className="match-label">BEST MATCH</span>
                <span className="match-percent">96%</span>
              </div>

              <div className="hero-avatar">{getInitial(profile)}</div>

              <h3>{getName(profile)}</h3>

              <p>{profile?.bio || "SkillSwap Community Member"}</p>

              <div className="hero-tags">
                {getTeachSkills(profile)
                  .slice(0, 2)
                  .map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}

                {getLearnSkills(profile)
                  .slice(0, 2)
                  .map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
              </div>

              <button onClick={() => setPage("profile")}>
                View my profile →
              </button>
            </div>

            <div className="floating-skill skill-right">
              <span>🎨</span>
              <div>
                <strong>
                  {getLearnSkills(profile)[0] || "UI / UX Design"}
                </strong>
                <small>Wants to learn</small>
              </div>
            </div>
          </div>
        </section>

        <section className="discover-section" id="discover">
          <div className="section-heading">
            <span className="eyebrow">FIND YOUR PEOPLE</span>
            <h2>Discover skill matches</h2>
            <p>
              Connect with passionate learners and teachers ready to swap knowledge.
            </p>
          </div>

          <div className="search-box">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, skill (Python, React, Design), or location..."
            />
          </div>

          {loadingProfiles ? (
            <div className="chat-empty-state">
              <div className="spinner" />
              <p style={{ marginTop: "14px" }}>Finding your skill matches...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="chat-empty-state">
              <div className="empty-icon">✦</div>
              <h3>No matches found</h3>
              <p>Try searching for a different skill or clear your filter.</p>
              {search && (
                <button
                  className="secondary-button"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="profile-grid">
              {filteredProfiles.map(renderProfileCard)}
            </div>
          )}
        </section>

        <section className="features-section">
          <div className="feature">
            <div className="feature-icon">🎯</div>
            <div>
              <h3>Smart Matching</h3>
              <p>
                Matches you automatically based on skills you can teach and skills
                you want to learn.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">💬</div>
            <div>
              <h3>Real-Time Chat</h3>
              <p>
                Instant messaging with your swap partners to plan sessions and
                share resources.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">🤝</div>
            <div>
              <h3>Skill Exchange</h3>
              <p>
                Level up your craft for free by exchanging real-world knowledge
                with peers.
              </p>
            </div>
          </div>
        </section>
      </>
    );
  }

  /* =========================
     CHAT & MESSAGING PAGE
  ========================= */

  function renderChat() {
    const isMobileChatActive = Boolean(activeChatUser);

    return (
      <section className="inside-page chat-view-page">

        {/* Incoming Pending Connection Requests Banner */}
        {pendingIncomingRequests.length > 0 && !activeChatUser && (
          <div className="pending-banner">
            <div className="pending-banner-text">
              <h4>
                📬 You have {pendingIncomingRequests.length} pending connection{" "}
                {pendingIncomingRequests.length === 1 ? "request" : "requests"}
              </h4>
              <p>Accept to start chatting and swapping skills!</p>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {pendingIncomingRequests.map((req) => {
                const requesterId = req.sender_id || req.requester_id;
                const requester = findPerson(requesterId);

                return (
                  <div
                    key={req.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "white",
                      padding: "6px 12px",
                      borderRadius: "10px",
                      border: "1px solid #fed7aa",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: "700" }}>
                      {getName(requester)}
                    </span>
                    <button
                      className="primary-button"
                      style={{ padding: "5px 12px", fontSize: "11px" }}
                      onClick={() => acceptConnection(req.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="danger-button"
                      style={{ padding: "5px 10px", fontSize: "11px" }}
                      onClick={() => declineConnection(req.id)}
                    >
                      Decline
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Teaching Confirmations Notification */}
        {pendingConfirmations.length > 0 && !activeChatUser && (
          <div className="pending-confirmations-banner">
            <div className="pending-confirmations-header">
              <span className="pending-confirmations-icon">🎓</span>
              <div className="pending-confirmations-text">
                <h4>
                  You have {pendingConfirmations.length} teaching session{" "}
                  {pendingConfirmations.length === 1 ? "needing" : "needing"} your
                  confirmation
                </h4>
                <p>
                  A teacher has marked your session as complete. Confirm to award
                  them +10 Skill Points!
                </p>
              </div>
            </div>
            <div className="pending-confirmations-list">
              {pendingConfirmations.map((session) => {
                const teacher = findPerson(session.teacher_id);
                return (
                  <div key={session.id} className="pending-confirmation-card">
                    <div className="pending-confirmation-info">
                      <span className="pending-confirmation-skill">
                        🎓 {session.skill}
                      </span>
                      <span className="pending-confirmation-teacher">
                        by {getName(teacher)}
                      </span>
                    </div>
                    <div className="pending-confirmation-actions">
                      <button
                        className="primary-button"
                        style={{ padding: "6px 14px", fontSize: "11px" }}
                        disabled={completingSession}
                        onClick={() => confirmTeachingComplete(session.id)}
                      >
                        {completingSession ? "Confirming..." : "✅ Confirm"}
                      </button>
                      <button
                        className="secondary-button"
                        style={{ padding: "6px 12px", fontSize: "11px" }}
                        onClick={() => {
                          setDismissedNotifications((prev) =>
                            new Set([...prev, session.id])
                          );
                        }}
                      >
                        Not Yet
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              className="pending-confirmations-view-all"
              onClick={() => setPage("profile")}
            >
              View all on Profile →
            </button>
          </div>
        )}

        {/* Two-Pane Conversational Layout */}
        <div className="chat-container-layout">
          {/* LEFT: Inbox Sidebar */}
          <div
            className={`chat-inbox-sidebar ${
              isMobileChatActive ? "hidden-mobile" : ""
            }`}
          >
            <div className="inbox-header">
              <h2>Conversations</h2>
              <div className="inbox-search">
                <span>⌕</span>
                <input
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search chats..."
                />
              </div>
            </div>

            <div className="inbox-list">
              {conversations.length === 0 ? (
                <div style={{ padding: "30px 16px", textAlign: "center" }}>
                  <span style={{ fontSize: "28px", display: "block" }}>👥</span>
                  <h4
                    style={{
                      fontSize: "14px",
                      color: "#333",
                      marginTop: "10px",
                      fontWeight: "700",
                    }}
                  >
                    No active chats yet
                  </h4>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      marginTop: "4px",
                      lineHeight: "1.4",
                    }}
                  >
                    Connect with learners or teachers in Discover to start chatting!
                  </p>
                  <button
                    className="primary-button"
                    style={{
                      marginTop: "16px",
                      width: "100%",
                      fontSize: "12px",
                    }}
                    onClick={() => setPage("discover")}
                  >
                    Find matches →
                  </button>
                </div>
              ) : (
                conversations.map(({ partner, lastMessage, unreadCount }) => {
                  const isActive = activeChatUser?.id === partner.id;

                  return (
                    <button
                      key={partner.id}
                      className={`inbox-item ${isActive ? "active" : ""} ${unreadCount > 0 ? "has-unread" : ""}`}
                      onClick={() => setActiveChatUser(partner)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        showConvContextMenu(partner, e);
                      }}
                      onPointerDown={(e) => handleConvLongPressStart(e, partner)}
                      onPointerUp={handleConvLongPressEnd}
                      onPointerLeave={handleConvLongPressEnd}
                    >
                      <div className="inbox-avatar clickable-avatar" onClick={(e) => { e.stopPropagation(); openPublicProfile(partner.id); }}>
                        {partner.avatar_url ? (
                          <img src={partner.avatar_url} alt={getName(partner)} />
                        ) : (
                          getInitial(partner)
                        )}
                        <span className={`online-dot ${onlineUsers.has(partner.id) ? "is-online" : ""}`} />
                      </div>

                      <div className="inbox-item-info">
                        <div className="inbox-item-top">
                          <span className="inbox-item-name">
                            {getName(partner)}
                            {unreadCount > 0 && (
                              <span className="unread-badge">{unreadCount}</span>
                            )}
                          </span>
                          {lastMessage && (
                            <span className="inbox-item-time">
                              {formatTime(lastMessage.created_at)}
                            </span>
                          )}
                        </div>

                        <p className={`inbox-item-preview ${unreadCount > 0 ? "unread-preview" : ""}`}>
                          {lastMessage
                            ? (lastMessage.sender_id === session?.user?.id
                                ? "You: "
                                : "") + lastMessage.content
                            : "Click to open chat"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Active Chat Room or Selection Placeholder */}
          <div
            className={`real-chat-main ${
              !isMobileChatActive ? "hidden-mobile" : ""
            }`}
          >
            {activeChatUser ? (
              <>
                {/* Chat Room Top Bar */}
                <div className="chat-room-header">
                  <div className="chat-room-partner">
                    <button
                      className="chat-back-btn"
                      onClick={() => setActiveChatUser(null)}
                    >
                      ←
                    </button>

                    <div className="partner-avatar clickable-avatar" onClick={() => openPublicProfile(activeChatUser.id)}>
                      {activeChatUser.avatar_url ? (
                        <img
                          src={activeChatUser.avatar_url}
                          alt={getName(activeChatUser)}
                        />
                      ) : (
                        getInitial(activeChatUser)
                      )}
                      <span className={`online-dot ${onlineUsers.has(activeChatUser.id) ? "is-online" : ""}`} />
                    </div>

                    <div className="partner-info">
                      <h3 className="clickable-name" onClick={() => openPublicProfile(activeChatUser.id)}>{getName(activeChatUser)}</h3>
                      <p>
                        <span className="clickable-name" onClick={() => openPublicProfile(activeChatUser.id)}>@{activeChatUser.username || "member"}</span> ·{" "}
                        {typingUsers[activeChatUser.id] ? (
                          <span className="typing-status-text">typing...</span>
                        ) : onlineUsers.has(activeChatUser.id) ? (
                          <span className="online-status-text">Online</span>
                        ) : (
                          <span>{activeChatUser.location || "SkillSwap Member"}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="chat-call-buttons">
                    <button
                      className="call-btn voice-call-btn"
                      onClick={() => startCall("voice")}
                      disabled={!!callState || !!incomingCall}
                      title="Voice Call"
                    >
                      📞
                    </button>
                    <button
                      className="call-btn video-call-btn"
                      onClick={() => startCall("video")}
                      disabled={!!callState || !!incomingCall}
                      title="Video Call"
                    >
                      🎥
                    </button>
                  </div>
                </div>

                {/* Messages Stream - Direct container scrolling */}
                <div className="real-chat-messages" ref={messagesContainerRef} onClick={(e) => {
                  if (showReactionPicker && !e.target.closest(".reaction-picker") && !e.target.closest(".reaction-option")) {
                    setShowReactionPicker(null);
                  }
                  if (showMessageMenu && !e.target.closest(".msg-action-menu")) {
                    closeMessageMenu();
                  }
                }}>
                  {loadingChat ? (
                    <div className="chat-empty-state">
                      <div className="spinner" />
                      <p style={{ marginTop: "12px" }}>Loading messages...</p>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="chat-empty-state">
                      <div className="empty-icon">💬</div>
                      <h3>No messages yet</h3>
                      <p>
                        Say hello to <strong>{getName(activeChatUser)}</strong>{" "}
                        and propose a skill swap session!
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, index) => {
                      const isMine = msg.sender_id === session?.user?.id;
                      const isImageMsg = msg.content?.startsWith("[image:");
                      const isVideoMsg = msg.content?.startsWith("[video:");
                      const isVoiceMsg = msg.message_type === "voice" || msg.content?.startsWith("[voice:");
                      const isUnsent = !!msg.unsent_at;
                      const mediaUrl = (isImageMsg || isVideoMsg)
                        ? msg.content.replace(/\[image:|\[video:|\]/g, "")
                        : isVoiceMsg ? msg.media_url : null;
                      const reactions = msg.reactions || {};
                      const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);

                      // Determine if this is the last seen message
                      const isLastSeen = isMine && msg.status === "seen" && !String(msg.id).startsWith("temp-") && (
                        index === chatMessages.length - 1 ||
                        chatMessages[index + 1]?.sender_id !== session?.user?.id ||
                        chatMessages[index + 1]?.status !== "seen"
                      );

                      return (
                        <div
                          key={msg.id || index}
                          className={`message-row ${isMine ? "mine" : ""} ${isUnsent ? "unsent" : ""}`}
                          style={{ position: "relative" }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (!msg.sending && !String(msg.id).startsWith("temp-")) {
                              showMessageMenuForMsg(msg, e);
                            }
                          }}
                          onPointerDown={(e) => {
                            if (!msg.sending && !String(msg.id).startsWith("temp-")) {
                              handleLongPressStart(e, msg);
                            }
                          }}
                          onPointerMove={handleLongPressMove}
                          onPointerUp={handleLongPressEnd}
                          onPointerLeave={handleLongPressEnd}
                        >
                          {!isMine && (
                            <div
                              className="inbox-avatar clickable-avatar"
                              style={{ width: "30px", height: "30px", fontSize: "12px" }}
                              onClick={() => openPublicProfile(activeChatUser.id)}
                            >
                              {activeChatUser.avatar_url ? (
                                <img
                                  src={activeChatUser.avatar_url}
                                  alt={getName(activeChatUser)}
                                />
                              ) : (
                                getInitial(activeChatUser)
                              )}
                            </div>
                          )}

                          <div className="message-bubble-wrapper">
                            {/* Three-dot menu for mobile */}
                            {!msg.sending && !String(msg.id).startsWith("temp-") && !isUnsent && (
                              <button
                                className="msg-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showMessageMenuForMsg(msg, e);
                                }}
                                aria-label="Message options"
                              >
                                ⋯
                              </button>
                            )}
                            {/* Reply preview */}
                            {msg.reply_to_id && msg.reply_to_content && (
                              <div className="reply-preview" onClick={() => {
                                const el = document.querySelector(`[data-msg-id="${msg.reply_to_id}"]`);
                                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                              }}>
                                <span className="reply-preview-name">{msg.reply_to_sender_name || "Message"}</span>
                                <span className="reply-preview-text">
                                  {msg.reply_to_content.startsWith("[image:") ? "Photo" :
                                   msg.reply_to_content.startsWith("[video:") ? "Video" :
                                   msg.reply_to_content.startsWith("[voice:") ? "Voice message" :
                                   msg.reply_to_content.length > 60 ? msg.reply_to_content.slice(0, 60) + "..." : msg.reply_to_content}
                                </span>
                              </div>
                            )}

                            <div className={`message-bubble ${isVoiceMsg ? "voice-bubble" : ""}`} data-msg-id={msg.id}>
                              {isUnsent ? (
                                <span className="unsent-text">{msg.content || "You unsent this message"}</span>
                              ) : isVoiceMsg ? (
                                <div className="voice-message-player">
                                  <button
                                    className="voice-play-btn"
                                    onClick={(e) => { e.stopPropagation(); toggleVoicePlayback(msg); }}
                                    aria-label={playingVoiceId === msg.id ? "Pause voice message" : "Play voice message"}
                                  >
                                    {playingVoiceId === msg.id ? "⏸" : "▶"}
                                  </button>
                                  <div className="voice-waveform">
                                    <div
                                      className="voice-progress-bar"
                                      style={{ width: `${voiceProgress[msg.id] || 0}%` }}
                                    />
                                  </div>
                                  <span className="voice-duration">
                                    {playingVoiceId === msg.id
                                      ? formatRecordingTime(Math.floor((voiceProgress[msg.id] / 100) * (msg.duration || 0)))
                                      : formatVoiceDuration(msg.duration)}
                                  </span>
                                </div>
                              ) : isImageMsg && mediaUrl ? (
                                <img
                                  src={mediaUrl}
                                  alt="Shared image"
                                  style={{ maxWidth: "240px", borderRadius: "8px", display: "block", marginBottom: "4px", cursor: "pointer" }}
                                  onClick={() => setLightboxUrl(mediaUrl)}
                                />
                              ) : isVideoMsg && mediaUrl ? (
                                <video
                                  src={mediaUrl}
                                  controls
                                  style={{ maxWidth: "240px", borderRadius: "8px", display: "block", marginBottom: "4px" }}
                                />
                              ) : (
                                msg.content
                              )}
                              {!isUnsent && (
                                <div className="message-bubble-footer">
                                  <span>{formatTime(msg.created_at)}</span>
                                  {msg.sending && (
                                    <span style={{ opacity: 0.8, fontSize: "11px" }}>Sending...</span>
                                  )}
                                  {isMine && !msg.sending && msg.id && !String(msg.id).startsWith("temp-") && (
                                    <span className={`message-status ${msg.status || "sent"}`}>
                                      {msg.status === "seen" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}
                                    </span>
                                  )}
                                </div>
                              )}
                              {isLastSeen && (
                                <div className="seen-indicator">Seen</div>
                              )}
                            </div>

                            {/* Reactions display */}
                            {!isUnsent && reactionEntries.length > 0 && (
                              <div className={`message-reactions ${isMine ? "mine" : ""}`}>
                                {reactionEntries.map(([emoji, users]) => (
                                  <button
                                    key={emoji}
                                    className={`reaction-chip ${users.includes(session?.user?.id) ? "reacted" : ""}`}
                                    onClick={() => addReaction(msg.id, emoji)}
                                  >
                                    {emoji} <span>{users.length}</span>
                                  </button>
                                ))}
                                <button
                                  className="reaction-chip add-reaction"
                                  onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                                >
                                  +
                                </button>
                              </div>
                            )}

                            {/* Reaction picker */}
                            {showReactionPicker === msg.id && (
                              <div className={`reaction-picker ${isMine ? "mine" : ""}`}>
                                {["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"].map((emoji) => (
                                  <button
                                    key={emoji}
                                    className="reaction-option"
                                    onClick={() => addReaction(msg.id, emoji)}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Conversation Context Menu */}
                {showConvMenu && convMenuTarget && (
                  <div className="msg-menu-overlay" onClick={closeConvMenu}>
                    <div
                      className="msg-action-menu"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        top: convMenuPos.top,
                        left: convMenuPos.left,
                        transform: "translateX(-50%)",
                      }}
                    >
                      <button className="msg-menu-item" onClick={() => { openChat(convMenuTarget); closeConvMenu(); }}>
                        <span className="msg-menu-icon">💬</span> Open chat
                      </button>
                      <button className="msg-menu-item" onClick={() => { openPublicProfile(convMenuTarget.id); closeConvMenu(); }}>
                        <span className="msg-menu-icon">👤</span> View profile
                      </button>
                      <div className="msg-menu-divider" />
                      <button className="msg-menu-item danger" onClick={() => {
                        if (confirm("Clear all messages in this conversation? This cannot be undone.")) {
                          clearConversation(convMenuTarget);
                        } else {
                          closeConvMenu();
                        }
                      }}>
                        <span className="msg-menu-icon">🗑</span> Clear conversation
                      </button>
                      <button className="msg-menu-item cancel" onClick={closeConvMenu}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Action Menu (Context Menu) */}
                {showMessageMenu && selectedMessage && (
                  <div className="msg-menu-overlay" onClick={closeMessageMenu}>
                    <div
                      className="msg-action-menu"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        top: menuPosition.top,
                        left: menuPosition.left,
                        transform: "translateX(-50%)",
                      }}
                    >
                      <button className="msg-menu-item" onClick={() => { startReply(selectedMessage); closeMessageMenu(); }}>
                        <span className="msg-menu-icon">↩</span> Reply
                      </button>
                      {selectedMessage.message_type !== "voice" && (
                        <button className="msg-menu-item" onClick={() => copyMessage(selectedMessage)}>
                          <span className="msg-menu-icon">📋</span> Copy
                        </button>
                      )}
                      <button className="msg-menu-item" onClick={() => { setShowReactionPicker(selectedMessage.id); closeMessageMenu(); }}>
                        <span className="msg-menu-icon">😊</span> React
                      </button>
                      <div className="msg-menu-divider" />
                      <button className="msg-menu-item" onClick={() => deleteForMe(selectedMessage)}>
                        <span className="msg-menu-icon">🗑</span> Delete for me
                      </button>
                      {selectedMessage.sender_id === session?.user?.id && !String(selectedMessage.id).startsWith("temp-") && (
                        <button className="msg-menu-item danger" onClick={() => {
                          if (confirm("Unsend this message? It will be removed for everyone.")) {
                            unsendMsg(selectedMessage);
                          } else {
                            closeMessageMenu();
                          }
                        }}>
                          <span className="msg-menu-icon">🚫</span> Unsend
                        </button>
                      )}
                      <button className="msg-menu-item cancel" onClick={closeMessageMenu}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Icebreaker Suggestions */}
                <div className="icebreakers-bar">
                  <button
                    className="icebreaker-chip"
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        `Hi ${getName(
                          activeChatUser
                        )}! I'd love to swap skills with you. When are you free for a quick intro?`
                      )
                    }
                  >
                    👋 Propose swap
                  </button>

                  <button
                    className="icebreaker-chip"
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        `Hey! I saw you teach ${
                          getTeachSkills(activeChatUser)[0] || "skills"
                        }. Would love to learn more!`
                      )
                    }
                  >
                    💡 Ask about {getTeachSkills(activeChatUser)[0] || "skills"}
                  </button>

                  <button
                    className="icebreaker-chip"
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        `I can help you learn ${
                          getLearnSkills(activeChatUser)[0] || "new skills"
                        } in exchange. Let me know if that works!`
                      )
                    }
                  >
                    🤝 Offer teaching
                  </button>
                </div>

                {/* Chat Input Bar - Instagram Style */}
                {replyTo && (
                  <div className="reply-bar">
                    <div className="reply-bar-content">
                      <span className="reply-bar-icon">↩</span>
                      <div className="reply-bar-info">
                        <span className="reply-bar-name">Replying to {replyTo.sender_name}</span>
                        <span className="reply-bar-text">
                          {replyTo.content?.startsWith("[image:") ? "Photo" :
                           replyTo.content?.startsWith("[video:") ? "Video" :
                           replyTo.content?.startsWith("[voice:") ? "Voice message" :
                           (replyTo.content || "").length > 50 ? replyTo.content.slice(0, 50) + "..." : replyTo.content}
                        </span>
                      </div>
                    </div>
                    <button className="reply-bar-close" onClick={resetReply}>×</button>
                  </div>
                )}

                {/* Media Preview */}
                {mediaPreview && (
                  <div className="media-preview-bar">
                    <img src={mediaPreview} alt="Preview" className="media-preview-img" />
                    <button className="media-preview-cancel" onClick={cancelMediaPreview}>×</button>
                    <button className="media-preview-send" onClick={sendMediaMessage} disabled={sendingMessage}>
                      {sendingMessage ? "..." : "Send"}
                    </button>
                  </div>
                )}

                {/* Hidden file inputs */}
                <input type="file" ref={cameraInputRef} accept="image/*,video/*" capture="environment"
                  onChange={handleCameraCapture} style={{ display: "none" }} />
                <input type="file" ref={chatFileInputRef} accept="image/*,video/*"
                  onChange={handleMediaSelect} style={{ display: "none" }} />

                {/* Recording UI */}
                {isRecording ? (
                  <div className="ig-recording-bar">
                    <button type="button" className="ig-rec-cancel" onClick={cancelRecording} aria-label="Cancel recording">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <div className="ig-rec-indicator">
                      <span className="ig-rec-dot" />
                      <span className="ig-rec-time">{formatRecordingTime(recordingTime)}</span>
                    </div>
                    <div className="ig-rec-waveform">
                      {waveformData.map((val, i) => (
                        <div key={i} className="ig-rec-bar" style={{ height: `${Math.max(4, val * 100)}%` }} />
                      ))}
                    </div>
                    <button type="button" className="ig-rec-send" onClick={() => stopRecording(true)} aria-label="Send voice message">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                  </div>
                ) : (
                  <form className="ig-composer" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
                    {/* Camera button */}
                    <button type="button" className="ig-composer-btn" onClick={openCamera} aria-label="Open camera">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </button>

                    {/* Text input */}
                    <input
                      className="ig-composer-input"
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        broadcastTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 3000);
                      }}
                      placeholder="Message..."
                      disabled={sendingMessage}
                      autoFocus
                    />

                    {/* Right side: mic or send */}
                    {messageInput.trim() ? (
                      <button type="submit" className="ig-composer-btn ig-send-btn" disabled={sendingMessage} aria-label="Send message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      </button>
                    ) : (
                      <>
                        {/* Mic button */}
                        <button type="button" className="ig-composer-btn"
                          onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
                          onPointerUp={() => {}}
                          onPointerLeave={() => {}}
                          aria-label="Record voice message">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        </button>
                        {/* Image button */}
                        <button type="button" className="ig-composer-btn" onClick={() => chatFileInputRef.current?.click()} aria-label="Share photo or video">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </button>
                      </>
                    )}
                  </form>
                )}
              </>
            ) : (
              /* No Active Chat Selected Placeholder */
              <div className="chat-empty-state">
                <div className="empty-icon">💬</div>
                <h3>Select a conversation</h3>
                <p>
                  Choose a contact from the list on the left, or pick a member below to start chatting.
                </p>

                {profiles.length > 0 && (
                  <div style={{ marginTop: "12px", width: "100%", maxWidth: "420px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#7b7a8a",
                        display: "block",
                        marginBottom: "10px",
                        fontWeight: "700",
                      }}
                    >
                      Start a chat with community members:
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {profiles.slice(0, 4).map((p) => (
                        <button
                          key={p.id}
                          className="inbox-item"
                          style={{ border: "1px solid #ebe7f2" }}
                          onClick={() => setActiveChatUser(p)}
                        >
                          <div className="inbox-avatar" style={{ width: "36px", height: "36px", fontSize: "14px" }}>
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt={getName(p)} />
                            ) : (
                              getInitial(p)
                            )}
                          </div>
                          <div className="inbox-item-info">
                            <span className="inbox-item-name">{getName(p)}</span>
                            <span style={{ fontSize: "11px", color: "#8c8b99", display: "block" }}>
                              Teaches: {getTeachSkills(p)[0] || "Knowledge"} · Wants: {getLearnSkills(p)[0] || "Skills"}
                            </span>
                          </div>
                          <span style={{ color: "#7435e8", fontWeight: "700", fontSize: "13px" }}>Chat →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* =========================
     PROFILE PAGE
  ========================= */

  function renderProfile() {
    if (editing) {
      return (
        <section className="inside-page">
          <div className="edit-profile-card">
            <div className="edit-header">
              <div>
                <span className="eyebrow">YOUR PROFILE</span>
                <h2>Edit your profile</h2>
                <p>
                  Share what skills you can teach and what you want to learn.
                </p>
              </div>

              <button className="close-edit" onClick={() => setEditing(false)}>
                ×
              </button>
            </div>

            <form className="profile-form" onSubmit={saveProfile}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full name</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => updateForm("full_name", e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Username</label>
                  <input
                    value={form.username}
                    onChange={(e) => updateForm("username", e.target.value)}
                    placeholder="yourusername"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input
                    value={form.location}
                    onChange={(e) => updateForm("location", e.target.value)}
                    placeholder="e.g. Bangalore, India"
                  />
                </div>

                <div className="form-group">
                  <label>Profile photo</label>
                  <input
                    type="file"
                    ref={profileImageInputRef}
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    style={{ display: "none" }}
                  />
                  <div className="profile-photo-upload" onClick={() => profileImageInputRef.current?.click()}>
                    {form.avatar_url ? (
                      <img src={form.avatar_url} alt="Profile" className="profile-photo-preview" />
                    ) : (
                      <span className="profile-photo-placeholder">📷 Click to upload photo</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>About you (Bio)</label>
                <textarea
                  rows="4"
                  value={form.bio}
                  onChange={(e) => updateForm("bio", e.target.value)}
                  placeholder="Tell people about yourself, your background, and your learning goals..."
                />
              </div>

              <div className="form-group">
                <label>Skills I can teach (comma-separated)</label>
                <input
                  value={form.skills_teach}
                  onChange={(e) => updateForm("skills_teach", e.target.value)}
                  placeholder="Python, React, UI Design, Photography"
                />
              </div>

              <div className="form-group">
                <label>Skills I want to learn (comma-separated)</label>
                <input
                  value={form.skills_learn}
                  onChange={(e) => updateForm("skills_learn", e.target.value)}
                  placeholder="Data Structures, Figma, Spanish, Public Speaking"
                />
              </div>

              <div className="form-group">
                <label>Languages spoken</label>
                <input
                  value={form.languages}
                  onChange={(e) => updateForm("languages", e.target.value)}
                  placeholder="English, Hindi, Kannada"
                />
              </div>

              <div className="form-group">
                <label>Experience</label>
                <textarea
                  rows="3"
                  value={form.experience}
                  onChange={(e) => updateForm("experience", e.target.value)}
                  placeholder="Describe your experience with the skills you teach..."
                />
              </div>

              <div className="form-group">
                <label>Availability</label>
                <input
                  value={form.availability}
                  onChange={(e) => updateForm("availability", e.target.value)}
                  placeholder="e.g. Weekdays 6-9 PM, Weekends flexible"
                />
              </div>

              <div className="form-group">
                <label>Privacy Settings</label>
                <div className="privacy-settings">
                  {[
                    { key: "show_location", label: "Show location" },
                    { key: "show_bio", label: "Show bio" },
                    { key: "show_skills", label: "Show skills" },
                    { key: "show_reviews", label: "Show reviews" },
                    { key: "show_stats", label: "Show session statistics" },
                    { key: "show_availability", label: "Show availability" },
                  ].map(({ key, label }) => (
                    <label className="privacy-toggle" key={key}>
                      <input
                        type="checkbox"
                        checked={form.privacy_settings[key] !== false}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            privacy_settings: {
                              ...prev.privacy_settings,
                              [key]: e.target.checked,
                            },
                          }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </form>
          </div>
        </section>
      );
    }

    return (
      <section className="inside-page">
        <div className="inside-header">
          <span className="eyebrow">YOUR PROFILE</span>
          <h1>{getName(profile)}</h1>
          <p>Your public SkillSwap identity and skill preferences</p>
        </div>

        <div className="profile-dashboard">
          <div className="profile-main-card">
            <div className="large-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={getName(profile)} />
              ) : (
                getInitial(profile)
              )}
            </div>

            <h2>{getName(profile)}</h2>
            <div className="profile-handle">@{profile?.username || "member"}</div>
            <div className="profile-email" style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "4px" }}>
              📧 {session?.user?.email || ""}
            </div>

            {profile?.location && (
              <div className="location" style={{ justifyContent: "center" }}>
                📍 {profile.location}
              </div>
            )}

            <p className="dashboard-bio">
              {profile?.bio || "No bio added yet. Click edit to introduce yourself!"}
            </p>

            <button
              className="primary-button edit-profile-button"
              onClick={() => setEditing(true)}
            >
              ✏️ Edit Profile
            </button>

            <button
              className="secondary-button"
              onClick={handleLogout}
              disabled={loading}
              style={{ marginTop: "8px", width: "100%" }}
            >
              {loading ? "Signing out..." : "🚪 Logout"}
            </button>
          </div>

          <div className="profile-info">
            <div className="info-box">
              <span className="skills-title">CAN TEACH</span>
              <div className="tags big-tags">
                {getTeachSkills(profile).length > 0 ? (
                  getTeachSkills(profile).map((skill) => (
                    <span className="tag teach" key={skill}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#999", fontSize: "13px" }}>
                    No teaching skills listed yet.
                  </span>
                )}
              </div>
            </div>

            <div className="info-box">
              <span className="skills-title">WANTS TO LEARN</span>
              <div className="tags big-tags">
                {getLearnSkills(profile).length > 0 ? (
                  getLearnSkills(profile).map((skill) => (
                    <span className="tag learn" key={skill}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#999", fontSize: "13px" }}>
                    No learning goals listed yet.
                  </span>
                )}
              </div>
            </div>

            <div className="info-box">
              <span className="skills-title">LANGUAGES</span>
              <div className="tags big-tags">
                {splitSkills(profile?.languages).length > 0 ? (
                  splitSkills(profile?.languages).map((language) => (
                    <span className="tag language" key={language}>
                      {language}
                    </span>
                  ))
                ) : (
                  <span className="tag language">English</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Skill Points Card ─── */}
        <div className="points-card">
          <div className="points-card-header">
            <div className="points-card-icon-wrap">🏆</div>
            <div>
              <h3 className="points-card-title">SkillSwap Points</h3>
              <p className="points-card-sub">Available points</p>
            </div>
          </div>
          <div className="points-balance-row">
            <div className="points-balance">{skillPointsLocal}</div>
            <span className="points-balance-label">pts</span>
          </div>
          <p className="points-card-note">
            Use points to join learning sessions (+5 pts) and earn more by teaching (+10 pts), giving feedback (+2 pts), or watching rewarded ads (+10 pts).
          </p>
          <button className="primary-button rewards-profile-btn" onClick={() => setPage("rewards")}>
            🎁 Earn Points
          </button>
        </div>

        {/* ─── Point History ─── */}
        {rewardHistory.length > 0 && (
          <div className="points-history-card">
            <div className="points-history-header">
              <span>📋</span>
              <h3>Points History</h3>
            </div>
            <div className="points-history-list">
              {rewardHistory.slice(0, 10).map((tx) => (
                <div className="points-history-item" key={tx.id}>
                  <div className="points-history-left">
                    <span className={`points-history-amount ${tx.type === "spent" ? "spent" : ""}`}>
                      {tx.type === "earned" ? "+" : "-"}{tx.amount}
                    </span>
                    <span className="points-history-reason">{tx.reason}</span>
                  </div>
                  <span className="points-history-date">
                    {new Date(tx.timestamp).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Pending Confirmations (Learner) ─── */}
        {pendingConfirmations.length > 0 && (
          <div className="pending-confirmations-section">
            <div className="section-header">
              <span className="section-icon">⏳</span>
              <div>
                <h3>Pending Confirmations</h3>
                <p className="section-sub">
                  Teachers have marked these sessions as complete. Confirm to
                  award them +10 Skill Points.
                </p>
              </div>
            </div>
            <div className="pending-confirmations-cards">
              {pendingConfirmations.map((session) => {
                const teacher = findPerson(session.teacher_id);
                return (
                  <div key={session.id} className="confirmation-card">
                    <div className="confirmation-card-top">
                      <span className="session-skill-badge">
                        🎓 {session.skill}
                      </span>
                      <span className="confirmation-teacher-name">
                        Teacher: {getName(teacher)}
                      </span>
                    </div>
                    <p className="confirmation-card-desc">
                      {getName(teacher)} has marked your{" "}
                      <strong>{session.skill}</strong> teaching session as
                      completed.
                    </p>
                    <div className="confirmation-status-grid">
                      <div className="status-row">
                        <span className="status-label">Teacher completed</span>
                        <span className="status-check">✓</span>
                      </div>
                      <div className="status-row">
                        <span className="status-label">
                          Your confirmation
                        </span>
                        <span className="status-pending">⏳</span>
                      </div>
                      <div className="status-row">
                        <span className="status-label">Reward</span>
                        <span className="status-pending">⏳</span>
                      </div>
                    </div>
                    <div className="confirmation-card-actions">
                      <button
                        className="primary-button confirm-btn"
                        disabled={completingSession}
                        onClick={() => confirmTeachingComplete(session.id)}
                      >
                        {completingSession
                          ? "Confirming..."
                          : "✅ Confirm Completed"}
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setDismissedNotifications((prev) =>
                            new Set([...prev, session.id])
                          );
                        }}
                      >
                        ❌ Not Yet
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Teaching Sessions Dashboard ─── */}
        {(myTeachingSessions.active.length > 0 ||
          myTeachingSessions.waiting.length > 0 ||
          myTeachingSessions.completed.length > 0) && (
          <div className="teaching-sessions-dashboard">
            <div className="section-header">
              <span className="section-icon">📚</span>
              <div>
                <h3>Teaching Sessions</h3>
                <p className="section-sub">
                  Track all your teaching and learning sessions
                </p>
              </div>
            </div>

            {/* Active Sessions */}
            {myTeachingSessions.active.length > 0 && (
              <div className="sessions-group">
                <h4 className="sessions-group-title">
                  <span className="group-dot active-dot" />
                  Active ({myTeachingSessions.active.length})
                </h4>
                {myTeachingSessions.active.map((session) => {
                  const isTeacher = session.teacher_id === session?.user?.id;
                  const otherPerson = findPerson(
                    isTeacher ? session.learner_id : session.teacher_id
                  );
                  return (
                    <div key={session.id} className="session-dashboard-card">
                      <div className="session-dashboard-top">
                        <span className="session-skill-badge">
                          🎓 {session.skill}
                        </span>
                        <span className="session-role-badge">
                          {isTeacher ? "You teach" : "You learn"}
                        </span>
                      </div>
                      <p className="session-dashboard-partner">
                        {isTeacher ? "Learner" : "Teacher"}:{" "}
                        {getName(otherPerson)}
                      </p>
                      <div className="confirmation-status-grid compact">
                        <div className="status-row">
                          <span className="status-label">
                            Teacher completed
                          </span>
                          <span
                            className={
                              session.teacher_done ? "status-check" : "status-pending"
                            }
                          >
                            {session.teacher_done ? "✓" : "⏳"}
                          </span>
                        </div>
                        <div className="status-row">
                          <span className="status-label">
                            Learner confirmation
                          </span>
                          <span
                            className={
                              session.learner_done ? "status-check" : "status-pending"
                            }
                          >
                            {session.learner_done ? "✓" : "⏳"}
                          </span>
                        </div>
                        <div className="status-row">
                          <span className="status-label">Reward</span>
                          <span className="status-pending">⏳</span>
                        </div>
                      </div>
                      {session.learner_id === session?.user?.id &&
                        session.teacher_done &&
                        !session.learner_done && (
                          <button
                            className="primary-button confirm-btn"
                            disabled={completingSession}
                            onClick={() => confirmTeachingComplete(session.id)}
                          >
                            {completingSession
                              ? "Confirming..."
                              : "✅ Confirm Completed"}
                          </button>
                        )}
                      {session.teacher_id === session?.user?.id &&
                        !session.teacher_done && (
                          <button
                            className="primary-button confirm-btn"
                            disabled={completingSession}
                            onClick={() => markSessionComplete(session.id)}
                          >
                            {completingSession
                              ? "Saving..."
                              : "✓ Mark Teaching Complete"}
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Waiting for Confirmation */}
            {myTeachingSessions.waiting.length > 0 && (
              <div className="sessions-group">
                <h4 className="sessions-group-title">
                  <span className="group-dot waiting-dot" />
                  Waiting for Confirmation ({myTeachingSessions.waiting.length})
                </h4>
                {myTeachingSessions.waiting.map((session) => {
                  const isTeacher = session.teacher_id === session?.user?.id;
                  const otherPerson = findPerson(
                    isTeacher ? session.learner_id : session.teacher_id
                  );
                  return (
                    <div
                      key={session.id}
                      className="session-dashboard-card waiting-card"
                    >
                      <div className="session-dashboard-top">
                        <span className="session-skill-badge">
                          🎓 {session.skill}
                        </span>
                        <span className="session-role-badge">
                          {isTeacher ? "You teach" : "You learn"}
                        </span>
                      </div>
                      <p className="session-dashboard-partner">
                        {isTeacher ? "Learner" : "Teacher"}:{" "}
                        {getName(otherPerson)}
                      </p>
                      <div className="confirmation-status-grid compact">
                        <div className="status-row">
                          <span className="status-label">
                            Teacher completed
                          </span>
                          <span
                            className={
                              session.teacher_done ? "status-check" : "status-pending"
                            }
                          >
                            {session.teacher_done ? "✓" : "⏳"}
                          </span>
                        </div>
                        <div className="status-row">
                          <span className="status-label">
                            Learner confirmation
                          </span>
                          <span
                            className={
                              session.learner_done ? "status-check" : "status-pending"
                            }
                          >
                            {session.learner_done ? "✓" : "⏳"}
                          </span>
                        </div>
                        <div className="status-row">
                          <span className="status-label">Reward</span>
                          <span className="status-pending">⏳</span>
                        </div>
                      </div>
                      <p className="session-waiting-msg">
                        {isTeacher
                          ? `⏳ Waiting for ${getName(otherPerson)} to confirm.`
                          : `⏳ You confirmed! Waiting for ${getName(otherPerson)} (teacher) to confirm.`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Sessions */}
            {myTeachingSessions.completed.length > 0 && (
              <div className="sessions-group">
                <h4 className="sessions-group-title">
                  <span className="group-dot completed-dot" />
                  Completed ({myTeachingSessions.completed.length})
                </h4>
                {myTeachingSessions.completed.map((session) => {
                  const isTeacher = session.teacher_id === session?.user?.id;
                  const otherPerson = findPerson(
                    isTeacher ? session.learner_id : session.teacher_id
                  );
                  return (
                    <div
                      key={session.id}
                      className="session-dashboard-card completed-card"
                    >
                      <div className="session-dashboard-top">
                        <span className="session-skill-badge">
                          🎓 {session.skill}
                        </span>
                        <span className="session-role-badge completed-badge">
                          {isTeacher ? "You teach" : "You learn"}
                        </span>
                      </div>
                      <p className="session-dashboard-partner">
                        {isTeacher ? "Learner" : "Teacher"}:{" "}
                        {getName(otherPerson)}
                      </p>
                      <div className="confirmation-status-grid compact">
                        <div className="status-row">
                          <span className="status-label">
                            Teacher completed
                          </span>
                          <span className="status-check">✓</span>
                        </div>
                        <div className="status-row">
                          <span className="status-label">
                            Learner confirmation
                          </span>
                          <span className="status-check">✓</span>
                        </div>
                        <div className="status-row">
                          <span className="status-label">Reward</span>
                          <span className="status-check reward-check">
                            +10 ✓
                          </span>
                        </div>
                      </div>
                      <span className="session-completed-date">
                        Completed{" "}
                        {new Date(
                          session.completed_at || session.created_at
                        ).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  function renderPublicProfile() {
    if (loadingViewProfile) {
      return (
        <section className="inside-page">
          <div className="profile-loading">
            <div className="spinner" />
            <p>Loading profile...</p>
          </div>
        </section>
      );
    }

    if (!viewingProfile) return null;

    const p = viewingProfile;
    const privacy = p.privacy_settings || {};
    const isOwn = p.id === session?.user?.id;
    const reviewData = p._reviews || {};
    const stats = reviewData.stats || { total_sessions: 0, avg_rating: 0, rated_sessions: 0 };
    const reviews = reviewData.reviews || [];

    const hasPendingSession = learningSessions.some(
      (s) =>
        s.status === "upcoming" &&
        ((s.host_id === session?.user?.id && s.participant_id === p.id) ||
          (s.participant_id === session?.user?.id && s.host_id === p.id))
    );
    const isConnected = learningSessions.some(
      (s) =>
        (s.status === "accepted" || s.status === "live") &&
        ((s.host_id === session?.user?.id && s.participant_id === p.id) ||
          (s.participant_id === session?.user?.id && s.host_id === p.id))
    );

    function handleRequestSession() {
      setViewingProfile(null);
      setViewingProfileId(null);
      setProfileViewStack([]);
      setCreateSessionForm((prev) => ({ ...prev, participantId: p.id }));
      setPage("sessions");
      setShowCreateSession(true);
    }

    return (
      <section className="inside-page">
        <div className="public-profile">
          <div className="public-profile-header">
            <button className="back-btn" onClick={closePublicProfile}>
              ← Back
            </button>
          </div>

          <div className="public-profile-hero">
            <div className="large-avatar">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={getName(p)} />
              ) : (
                getInitial(p)
              )}
            </div>

            <h1 className="public-profile-name">{getName(p)}</h1>
            {p.username && (
              <div className="public-profile-handle">@{p.username}</div>
            )}

            {privacy.show_location !== false && p.location && (
              <div className="public-profile-location">📍 {p.location}</div>
            )}

            <div className="public-profile-stats">
              {privacy.show_stats !== false && (
                <>
                  <div className="stat-item">
                    <span className="stat-number">{stats.total_sessions}</span>
                    <span className="stat-label">Sessions</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">
                      {stats.rated_sessions > 0
                        ? Number(stats.avg_rating).toFixed(1)
                        : "—"}
                    </span>
                    <span className="stat-label">Rating</span>
                  </div>
                </>
              )}
            </div>

            {!isOwn && (
              <div className="public-profile-actions">
                <button
                  className="primary-button"
                  onClick={() => { setViewingProfile(null); setViewingProfileId(null); setProfileViewStack([]); openChat(p); }}
                >
                  💬 Message
                </button>
                {hasPendingSession ? (
                  <button className="secondary-button" disabled>
                    ⏳ Request Pending
                  </button>
                ) : isConnected ? (
                  <button className="primary-button" onClick={() => { setViewingProfile(null); setViewingProfileId(null); setProfileViewStack([]); openChat(p); }}>
                    🚀 Start Session
                  </button>
                ) : (
                  <button
                    className="secondary-button"
                    onClick={handleRequestSession}
                  >
                    📅 Request Session
                  </button>
                )}
              </div>
            )}
          </div>

          {privacy.show_bio !== false && p.bio && (
            <div className="public-profile-section">
              <h3>About</h3>
              <p className="public-profile-bio">{p.bio}</p>
            </div>
          )}

          {p.experience && (
            <div className="public-profile-section">
              <h3>Experience</h3>
              <p className="public-profile-bio">{p.experience}</p>
            </div>
          )}

          {privacy.show_availability !== false && p.availability && (
            <div className="public-profile-section">
              <h3>Availability</h3>
              <p className="public-profile-bio">{p.availability}</p>
            </div>
          )}

          {privacy.show_skills !== false && (
            <div className="public-profile-section">
              <h3>Skills</h3>
              <div className="public-profile-skills">
                {getTeachSkills(p).length > 0 && (
                  <div className="skill-group">
                    <span className="skills-title">CAN TEACH</span>
                    <div className="tags big-tags">
                      {getTeachSkills(p).map((skill) => (
                        <span className="tag teach" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {getLearnSkills(p).length > 0 && (
                  <div className="skill-group">
                    <span className="skills-title">WANTS TO LEARN</span>
                    <div className="tags big-tags">
                      {getLearnSkills(p).map((skill) => (
                        <span className="tag learn" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {splitSkills(p.languages).length > 0 && (
                  <div className="skill-group">
                    <span className="skills-title">LANGUAGES</span>
                    <div className="tags big-tags">
                      {splitSkills(p.languages).map((lang) => (
                        <span className="tag language" key={lang}>
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {privacy.show_reviews !== false &&
            reviews.length > 0 && (
              <div className="public-profile-section">
                <h3>Reviews</h3>
                <div className="public-profile-reviews">
                  {reviews.map((r) => (
                      <div className="review-card" key={r.id}>
                        <div className="review-header">
                          <span className="review-stars">
                            {"⭐".repeat(r.rating)}
                          </span>
                          <span className="review-topic">{r.topic}</span>
                        </div>
                        {r.feedback && (
                          <p className="review-text">{r.feedback}</p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
        </div>
      </section>
    );
  }

  /* =========================
     LOGIN PAGE
  ========================= */

    /* =========================
     SESSIONS PAGE
  ========================= */

  function renderSessions() {
    if (sessionView === "live" && activeLiveSession) {
      return renderLiveSession();
    }
    if (sessionView === "summary" && sessionSummaryData) {
      return renderSessionSummary();
    }

    return (
      <section className="inside-page sessions-page">
        <div className="sessions-header">
          <div>
            <span className="eyebrow">🎓 SESSIONS</span>
            <h1>Learning Sessions</h1>
            <p className="sessions-subtitle">Teach what you know. Learn what you love.</p>
          </div>
          <button className="primary-button create-session-btn" onClick={() => setShowCreateSession(true)}>
            + Create Session
          </button>
        </div>

        <div className="sessions-tabs">
          <button className={`session-tab ${activeSessionTab === "upcoming" ? "active" : ""}`} onClick={() => setActiveSessionTab("upcoming")}>
            🟡 Upcoming ({upcomingSessions.length})
          </button>
          <button className={`session-tab ${activeSessionTab === "past" ? "active" : ""}`} onClick={() => setActiveSessionTab("past")}>
            ✅ Past ({pastSessions.length})
          </button>
        </div>

        <div className="sessions-content">
          {activeSessionTab === "upcoming" && (
            upcomingSessions.length === 0 ? (
              <div className="sessions-empty">
                <span className="empty-icon">🎓</span>
                <h3>No upcoming sessions</h3>
                <p>Create a session and start learning together.</p>
                <button className="primary-button" onClick={() => setShowCreateSession(true)}>+ Create Session</button>
              </div>
            ) : (
              <div className="sessions-grid">
                {upcomingSessions.map(s => {
                  const other = s.host_id === session.user.id ? findPerson(s.participant_id) : findPerson(s.host_id);
                  const otherName = s.host_id === session.user.id ? s.participant_name : s.host_name;
                  const isHost = s.host_id === session.user.id;
                  return (
                    <div key={s.id} className="session-card-full">
                      <div className="session-card-header">
                        <span className="session-skill-tag">{s.skill}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className={`session-status-badge status-${s.status}`}>
                            {s.status === "live" ? "🔴 Live" : s.status === "accepted" ? "🔵 Accepted" : "🟡 Upcoming"}
                          </span>
                          {isHost && (
                            <button className="delete-session-btn" title="Delete session" onClick={() => deleteLearningSession(s.id)}>🗑️</button>
                          )}
                        </div>
                      </div>
                      <h3 className="session-card-title">{s.topic}</h3>
                      <div className="session-card-meta">
                        <span>👤 With <span className="clickable-name" onClick={() => other?.id && openPublicProfile(other.id)}>{otherName}</span></span>
                      </div>
                      {s.description && <p className="session-card-desc">{s.description}</p>}
                      <div className="session-card-actions">
                        {isHost && s.status === "upcoming" && (
                          <>
                            <button className="secondary-button" onClick={() => {
                              const link = window.location.origin + window.location.pathname + "?session=" + s.id;
                              navigator.clipboard.writeText(link).then(() => showMessage("🔗 Session link copied! Share it with " + otherName)).catch(() => {
                                prompt("Copy this link to share:", link);
                              });
                            }}>📋 Copy Invite Link</button>
                            <span className="session-waiting-text">⏳ Waiting for {otherName} to accept</span>
                          </>
                        )}
                        {!isHost && s.status === "upcoming" && (
                          <>
                            <button className="primary-button" onClick={() => acceptSessionInvitation(s.id)}>✅ Accept</button>
                            <button className="danger-button" onClick={() => declineSessionInvitation(s.id)}>❌ Decline</button>
                          </>
                        )}
                        {(s.status === "accepted" || s.status === "live") && (
                          <button className="primary-button join-session-btn" onClick={() => handleJoinSession(s)}>{s.status === "live" ? "Join Live Session →" : "Join Session →"}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {activeSessionTab === "past" && (
            pastSessions.length === 0 ? (
              <div className="sessions-empty">
                <span className="empty-icon">✅</span>
                <h3>No past sessions</h3>
                <p>Complete a session to see it here.</p>
              </div>
            ) : (
              <div className="sessions-grid">
                {pastSessions.map(s => {
                  const otherId = s.host_id === session.user.id ? s.participant_id : s.host_id;
                  const other = findPerson(otherId);
                  const otherName = s.host_id === session.user.id ? s.participant_name : s.host_name;
                  const isHost = s.host_id === session.user.id;
                  return (
                    <div key={s.id} className={`session-card-full ${s.status === "live" ? "live-card" : ""} ${s.status === "declined" ? "declined-card" : ""}`}>
                      <div className="session-card-header">
                        <span className="session-skill-tag">{s.skill}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className={`session-status-badge status-${s.status}`}>
                            {s.status === "declined" ? "🔴 Declined" : "✅ Completed"}
                          </span>
                          <button className="delete-session-btn" title="Delete session" onClick={() => deleteLearningSession(s.id)}>🗑️</button>
                        </div>
                      </div>
                      <h3 className="session-card-title">{s.topic}</h3>
                      <div className="session-card-meta">
                        <span>👤 With <span className="clickable-name" onClick={() => otherId && openPublicProfile(otherId)}>{otherName}</span></span>
                      </div>
                      {s.rating > 0 && (
                        <div className="session-rating">{"⭐".repeat(s.rating)}</div>
                      )}
                      <div className="session-card-actions">
                        {s.status === "completed" && (
                          <button className="secondary-button" onClick={() => openSessionSummary(s)}>View Summary</button>
                        )}
                        {s.status === "declined" && (
                          <span className="session-declined-text">Session declined</span>
                        )}
                        <button className="danger-button" style={{ marginLeft: "8px" }} onClick={() => deleteLearningSession(s.id)}>🗑️ Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {showCreateSession && renderCreateSessionModal()}
      </section>
    );
  }

  function renderCreateSessionModal() {
    return (
      <div className="modal-overlay" onClick={() => setShowCreateSession(false)}>
        <div className="modal-card create-session-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Create Learning Session</h2>
            <button className="modal-close" onClick={() => setShowCreateSession(false)}>×</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Skill *</label>
              <select value={createSessionForm.skill} onChange={e => setCreateSessionForm(p => ({...p, skill: e.target.value}))}>
                <option value="">Select skill...</option>
                {skillOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Session Type *</label>
              <div className="type-options">
                {typeOptions.map(t => (
                  <button key={t.value} className={`type-option ${createSessionForm.type === t.value ? "active" : ""}`}
                    onClick={() => setCreateSessionForm(p => ({...p, type: t.value}))}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Topic *</label>
              <input value={createSessionForm.topic} onChange={e => setCreateSessionForm(p => ({...p, topic: e.target.value}))}
                placeholder="e.g. Python Functions and Loops" />
            </div>
            <div className="form-group">
              <label>Invite Person *</label>
              <select value={createSessionForm.participantId} onChange={e => setCreateSessionForm(p => ({...p, participantId: e.target.value}))}>
                <option value="">Select person...</option>
                {profiles.filter(p => p.id !== session.user.id).map(p => (
                  <option key={p.id} value={p.id}>{getName(p)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <textarea rows="3" value={createSessionForm.description} onChange={e => setCreateSessionForm(p => ({...p, description: e.target.value}))}
                placeholder="What would you like to learn or teach?" />
            </div>
          </div>
          <div className="modal-footer">
            <button className="secondary-button" onClick={() => setShowCreateSession(false)}>Cancel</button>
            <button className="primary-button" onClick={createLearningSession}>Create Session</button>
          </div>
        </div>
      </div>
    );
  }

  function renderLiveSession() {
    const session = activeLiveSession;
    if (!session) return null;
    const other = session.host_id === session.user?.id ? findPerson(session.participant_id) : findPerson(session.host_id);
    const otherName = session.host_id === session.user?.id ? session.participant_name : session.host_name;
    const doneCount = liveSessionState.checklist.filter(c => c.done).length;
    const totalCount = liveSessionState.checklist.length;
    const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

    return (
      <section className="live-session-page">
        <div className="live-topbar">
          <div className="live-topbar-left">
            <span className="live-brand">✦ SkillSwap 🎓</span>
            <span className="live-session-title">{session.topic}</span>
          </div>
          <div className="live-topbar-center">
            <span className="live-dot" />
            <span className="live-label">LIVE</span>
          </div>
          <div className="live-topbar-right">
            <span className="live-participants">👥 2</span>
          </div>
        </div>

        <div className="live-main">
          <div className="live-video-area">
            <div className="video-grid">
              <div className="video-card remote-video">
                <video ref={liveRemoteVideoRef} autoPlay playsInline style={{ objectFit: "cover", width: "100%", height: "100%", borderRadius: "12px", background: "#1a1a2e", position: "absolute", inset: 0, opacity: remoteVideoActive ? 1 : 0 }} />
                <div className="video-placeholder" style={{ opacity: remoteVideoActive ? 0 : 1, transition: "opacity 0.3s" }}>
                  <span className="video-avatar">{otherName?.[0] || "?"}</span>
                  <span className="video-name">{otherName}</span>
                  <span className="video-role">{session.type === "teach" ? "Teacher" : "Learner"}</span>
                </div>
                <span className="video-mic-icon">{liveSessionState.isMuted ? "🔇" : "🎤"}</span>
              </div>
              <div className="video-card local-video">
                {liveSessionState.isCameraOn ? (
                  <video ref={liveLocalVideoRef} autoPlay playsInline muted className="video-placeholder local" style={{ objectFit: "cover", width: "100%", height: "100%", borderRadius: "12px", transform: "scaleX(-1)" }} />
                ) : (
                  <div className="video-placeholder local">
                    <span className="video-avatar">{getName(profile)?.[0] || "?"}</span>
                    <span className="video-name">You</span>
                  </div>
                )}
              </div>
            </div>

            <div className="live-controls">
              <button className={`live-ctrl-btn ${liveSessionState.isMuted ? "off" : ""}`}
                onClick={toggleLiveMic}>
                {liveSessionState.isMuted ? "🔇 Mute" : "🎤 Mic"}
              </button>
              <button className={`live-ctrl-btn ${liveSessionState.isCameraOn ? "" : "off"}`}
                onClick={toggleLiveCamera}>
                {liveSessionState.isCameraOn ? "📹 Camera" : "📷 Off"}
              </button>
              <button className={`live-ctrl-btn ${liveSessionState.isScreenSharing ? "on" : ""}`}
                onClick={() => {
                  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                    navigator.mediaDevices.getDisplayMedia({ video: true }).then(() => {
                      setLiveSessionState(p => ({...p, isScreenSharing: true}));
                    }).catch(() => {
                      showMessage("Screen sharing cancelled or not available.");
                    });
                  } else {
                    showMessage("Screen sharing is not available in this browser.");
                  }
                }}>
                🖥 Share
              </button>
              <button className={`live-ctrl-btn ${liveSessionState.isChatOpen ? "on" : ""}`}
                onClick={() => setLiveSessionState(p => ({...p, isChatOpen: !p.isChatOpen, isParticipantOpen: false}))}>
                💬 Chat
              </button>
              <button className={`live-ctrl-btn ${liveSessionState.isWorkspaceOpen ? "on" : ""}`}
                onClick={() => setLiveSessionState(p => ({...p, isWorkspaceOpen: !p.isWorkspaceOpen}))}>
                📚 Workspace
              </button>
              <button className="live-ctrl-btn leave-btn" onClick={() => {
                if (confirm("Leave Learning Session?")) leaveLiveSession();
              }}>
                🔴 Leave
              </button>
            </div>
          </div>

          {liveSessionState.isWorkspaceOpen && (
            <div className="live-workspace">
              <div className="workspace-section">
                <h4>📚 Today's Topic</h4>
                <p className="workspace-topic">{session.topic}</p>
                <p className="workspace-skill">{session.skill}</p>
              </div>

              <div className="workspace-section">
                <h4>📋 Learning Plan</h4>
                <div className="workspace-progress">
                  <div className="progress-bar"><div className="progress-fill" style={{width: progress + "%"}} /></div>
                  <span className="progress-text">{doneCount} / {totalCount} completed</span>
                </div>
                <div className="checklist">
                  {liveSessionState.checklist.map((item, i) => (
                    <label key={item.id} className="checklist-item">
                      <input type="checkbox" checked={item.done}
                        onChange={() => {
                          const updated = liveSessionState.checklist.map((c, ci) =>
                            ci === i ? {...c, done: !c.done} : c
                          );
                          setLiveSessionState(p => ({...p, checklist: updated}));
                          supabase.from("learning_sessions").update({ checklist: updated }).eq("id", session.id);
                        }} />
                      <span className={item.done ? "done" : ""}>{item.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="workspace-section">
                <h4>📝 Shared Notes</h4>
                <textarea className="notes-editor" placeholder="Write notes together..."
                  value={liveSessionState.notes}
                  onChange={e => setLiveSessionState(p => ({...p, notes: e.target.value}))} />
                <button className="secondary-button save-notes-btn" onClick={() => {
                  supabase.from("learning_sessions").update({ notes: liveSessionState.notes }).eq("id", session.id);
                  showMessage("Notes saved ✓");
                }}>Save Notes</button>
              </div>
            </div>
          )}

          {liveSessionState.isChatOpen && (
            <div className="live-chat-panel">
              <div className="live-chat-header">
                <h4>💬 Session Chat</h4>
                <button className="modal-close" onClick={() => setLiveSessionState(p => ({...p, isChatOpen: false}))}>×</button>
              </div>
              <div className="live-chat-messages">
                {liveSessionState.chatMessages.length === 0 ? (
                  <p className="chat-empty-text">No messages yet. Start the conversation!</p>
                ) : (
                  liveSessionState.chatMessages.map((msg, i) => (
                    <div key={i} className="live-chat-msg">
                      <strong>{msg.sender === "you" ? "You" : otherName}:</strong>
                      <span>{msg.text}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="live-chat-input">
                <input placeholder="Type a message..." onKeyDown={e => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    const newMsg = { sender: "you", text: e.target.value.trim(), time: new Date().toISOString() };
                    const updated = [...liveSessionState.chatMessages, newMsg];
                    setLiveSessionState(p => ({...p, chatMessages: updated}));
                    supabase.from("learning_sessions").update({ messages: updated }).eq("id", session.id);
                    e.target.value = "";
                  }
                }} />
                <button className="primary-button" onClick={e => {
                  const input = e.target.parentElement.querySelector("input");
                  if (input && input.value.trim()) {
                    const newMsg = { sender: "you", text: input.value.trim(), time: new Date().toISOString() };
                    const updated = [...liveSessionState.chatMessages, newMsg];
                    setLiveSessionState(p => ({...p, chatMessages: updated}));
                    supabase.from("learning_sessions").update({ messages: updated }).eq("id", session.id);
                    input.value = "";
                  }
                }}>Send</button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderSessionSummary() {
    const s = sessionSummaryData;
    if (!s) return null;

    if (sessionView === "summary" && !s.rating && liveSessionState.rating === 0) {
      return (
        <section className="inside-page sessions-page">
          <div className="summary-feedback-card">
            <h2>🎉 Session Complete!</h2>
            <h3>{s.topic}</h3>
            <p>With <span className="clickable-name" onClick={() => { const oid = s.host_id === session.user?.id ? s.participant_id : s.host_id; oid && openPublicProfile(oid); }}>{s.host_id === session.user?.id ? s.participant_name : s.host_name}</span></p>
            <div className="feedback-rating">
              <p>Rate this teacher</p>
              <div className="star-rating">
                {[1,2,3,4,5].map(star => (
                  <button key={star} className={`star-btn ${liveSessionState.rating >= star ? "filled" : ""}`}
                    onClick={() => setLiveSessionState(p => ({...p, rating: star}))}>
                    ⭐
                  </button>
                ))}
              </div>
            </div>
            <div className="summary-actions">
              <button className="primary-button" disabled={liveSessionState.rating === 0} onClick={submitSessionFeedback}>Submit Rating</button>
              <button className="secondary-button" onClick={() => { setSessionView(null); setSessionSummaryData(null); setPage("sessions"); }}>Back to Sessions</button>
            </div>
          </div>
        </section>
      );
    }

    // Already rated — go back to sessions
    setSessionView(null);
    setSessionSummaryData(null);
    setPage("sessions");
    return null;
  }

  function renderRewards() {
    const hist = getRewardHistoryDisplay();
    const isZero = skillPointsLocal === 0;
    return (
      <section className="inside-page rewards-page">
        <div className="rewards-header">
          <div>
            <span className="eyebrow">🎁 REWARDS</span>
            <h1>SkillSwap Rewards</h1>
          </div>
        </div>

        <div className="rewards-balance-card">
          <div className="rewards-balance-icon">🪙</div>
          <div className="rewards-balance-info">
            <h2>Your Points</h2>
            <div className="rewards-balance-num">{skillPointsLocal}</div>
            <span className="rewards-balance-label">Points</span>
          </div>
          <p className="rewards-balance-desc">
            Use your points to learn, teach and connect.
          </p>
        </div>

        {isZero && (
          <div className="rewards-zero-card">
            <div className="rewards-zero-icon">⚠️</div>
            <h3>Your learning points are finished.</h3>
            <p>Don't worry — you can earn free points.</p>
            <div className="rewards-earn-promo">
              <div className="rewards-earn-promo-icon">🎁</div>
              <div>
                <strong>Watch 2 rewarded ads</strong>
                <p>Earn 🪙 +{TOTAL_AD_REWARD} Points</p>
              </div>
            </div>
            <button className="primary-button rewards-earn-btn" onClick={() => { resetAdProgress(); startAdFlow(); }}>
              🎬 Earn {TOTAL_AD_REWARD} Points
            </button>
          </div>
        )}

        {!isZero && (
          <div className="rewards-earn-card">
            <div className="rewards-earn-left">
              <span className="rewards-earn-icon">🎬</span>
              <div>
                <h3>Watch 2 Ads</h3>
                <p>+{TOTAL_AD_REWARD} Points</p>
              </div>
            </div>
            <button className="primary-button rewards-earn-btn" onClick={() => { resetAdProgress(); startAdFlow(); }}>
              Watch & Earn
            </button>
          </div>
        )}

        <div className="rewards-ways-card">
          <h3>Ways to earn</h3>
          <div className="rewards-ways-list">
            <div className="rewards-way-item">
              <span className="rewards-way-icon">👨‍🏫</span>
              <div className="rewards-way-info">
                <strong>Teach someone a skill</strong>
                <span>+10 Points</span>
              </div>
            </div>
            <div className="rewards-way-item">
              <span className="rewards-way-icon">🎬</span>
              <div className="rewards-way-info">
                <strong>Watch rewarded ads</strong>
                <span>+{TOTAL_AD_REWARD} Points</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rewards-history-card">
          <h3>Reward History</h3>
          {hist.length === 0 ? (
            <p className="rewards-history-empty">No transactions yet.</p>
          ) : (
            <div className="rewards-history-list">
              {hist.map(tx => (
                <div key={tx.id} className="rewards-history-item">
                  <div className="rewards-history-left">
                    <span className={`rewards-history-badge ${tx.type === "earned" ? "earned" : "spent"}`}>
                      {tx.type === "earned" ? "+" : "-"}{tx.amount}
                    </span>
                    <span className="rewards-history-reason">{tx.reason}</span>
                  </div>
                  <span className="rewards-history-date">{tx.dateStr}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

function renderLogin() {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-icon">✦</div>
            <span>SkillSwap</span>
          </div>

          <h2>{isSignUp ? "Create account" : "Welcome back"}</h2>
          <p className="login-subtitle">
            {isSignUp ? "Sign up to start swapping skills" : "Sign in to continue swapping skills"}
          </p>

          {error && (
            <div className="login-error-msg">
              <span>⚠️</span> {error}
            </div>
          )}

          {message && (
            <div className="login-error-msg" style={{ background: "#d4edda", color: "#155724", border: "1px solid #c3e6cb" }}>
              <span>✅</span> {message}
            </div>
          )}

          {isSignUp ? (
            <form className="login-form" onSubmit={handleSignUp}>
              <div className="form-group">
                <label>Full name</label>
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="John Doe"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={signUpUsername}
                  onChange={(e) => setSignUpUsername(e.target.value)}
                  placeholder="johndoe"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="primary-button login-submit-btn"
                disabled={loginLoading}
              >
                {loginLoading ? "Creating account..." : "Sign up →"}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="primary-button login-submit-btn"
                disabled={loginLoading}
              >
                {loginLoading ? "Signing in..." : "Sign in →"}
              </button>
            </form>
          )}

          <p className="login-footer-note">
            {isSignUp ? (
              <>Already have an account?{" "}
                <button
                  type="button"
                  className="login-link-btn"
                  onClick={() => { setIsSignUp(false); setError(""); setMessage(""); }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>Don't have an account?{" "}
                <button
                  type="button"
                  className="login-link-btn"
                  onClick={() => { setIsSignUp(true); setError(""); setMessage(""); }}
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  /* =========================
     MAIN APP SHELL
  ========================= */

  // Show login page when user has explicitly logged out
  if (page === "login") {
    return renderLogin();
  }



  return (
    <div
      className="app-shell"
      onClick={() => showAccountMenu && setShowAccountMenu(false)}
    >
      {/* ─── Reward Toast ─── */}
      {showRewardToast && (
        <div
          className="reward-toast"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="reward-toast-icon">🎉</span>
          <span className="reward-toast-msg">{rewardToastMsg}</span>
          <button
            className="reward-toast-close"
            onClick={() => setShowRewardToast(false)}
          >
            ×
          </button>
        </div>
      )}

      <header className="navbar">
        <div className="nav-content">
          <button
            className="brand"
            onClick={() => {
              setActiveChatUser(null);
              setPage("discover");
            }}
          >
            <span>✦</span>
            SkillSwap
          </button>

          <nav className="navigation">
            <button
              className={page === "discover" ? "nav-active" : ""}
              onClick={() => {
                setActiveChatUser(null);
                setPage("discover");
              }}
            >
              ✨ Discover
            </button>

            <button
              className={page === "chat" ? "nav-active" : ""}
              onClick={() => {
                setPage("chat");
              }}
            >
              💬 Chat
              {pendingIncomingRequests.length > 0 && (
                <span className="nav-badge">
                  {pendingIncomingRequests.length}
                </span>
              )}
            </button>

            <button
              className={page === "sessions" ? "nav-active" : ""}
              onClick={() => {
                setActiveChatUser(null);
                setSessionView(null);
                setSessionSummaryData(null);
                setPage("sessions");
              }}
            >
              🎓 Sessions
              {upcomingSessions.length > 0 && (
                <span className="nav-badge">
                  {upcomingSessions.length}
                </span>
              )}
            </button>

            <button
              className={page === "rewards" ? "nav-active" : ""}
              onClick={() => {
                setActiveChatUser(null);
                setPage("rewards");
              }}
            >
              🎁 Rewards
            </button>

            <button
              className={page === "profile" ? "nav-active" : ""}
              onClick={() => {
                setActiveChatUser(null);
                setPage("profile");
              }}
            >
              👤 Profile
            </button>
          </nav>

          {/* Account Menu */}
          <div
            className="account-area"
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative" }}
          >
            <button className="mobile-header-icon" onClick={() => { setActiveChatUser(null); setPage("discover"); }} title="Search">
              🔍
            </button>
            <button className="mobile-header-icon" onClick={() => setPage("chat")} title="Messages">
              💬
            </button>
            <div
              className="small-avatar account-avatar-btn"
              onClick={() => setShowAccountMenu((v) => !v)}
              title="Account menu"
              style={{ cursor: "pointer" }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={getName(profile)} />
              ) : (
                getInitial(profile)
              )}
            </div>

            {showAccountMenu && (
              <div className="account-dropdown">
                <div className="account-dropdown-user">
                  <strong>{getName(profile)}</strong>
                  <small>{session?.user?.email || ""}</small>
                </div>

                <div className="account-dropdown-divider" />

                <button
                  className="account-dropdown-item"
                  onClick={() => {
                    setShowAccountMenu(false);
                    setActiveChatUser(null);
                    setPage("profile");
                  }}
                >
                  👤 My Profile
                </button>

                <button
                  className="account-dropdown-item"
                  onClick={() => {
                    setShowAccountMenu(false);
                    setActiveChatUser(null);
                    setPage("profile");
                  }}
                >
                  🏆 Skill Points: <strong>{skillPointsLocal}</strong>
                </button>

                <div className="account-dropdown-divider" />

                <button
                  className="account-dropdown-item account-dropdown-logout"
                  onClick={handleLogout}
                  disabled={loading}
                >
                  {loading ? "Signing out..." : "🚪 Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {message && (
        <div className="notice">
          <span>✓</span>
          <p>{message}</p>
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {error && (
        <div className="error-notice">
          <span>!</span>
          <p>{error}</p>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      <main className={page === "chat" ? "chat-active" : ""}>
        {viewingProfile ? (
          renderPublicProfile()
        ) : (
          <>
            {page === "discover" && renderDiscover()}
            {page === "chat" && renderChat()}
            {page === "sessions" && renderSessions()}
            {page === "rewards" && renderRewards()}
            {page === "profile" && renderProfile()}
          </>
        )}
      </main>

      {/* ─── Mobile Bottom Navigation ─── */}
      <nav className="mobile-bottom-nav">
        <button
          className={page === "discover" && !viewingProfile ? "mbn-active" : ""}
          onClick={() => { setActiveChatUser(null); setViewingProfile(null); setPage("discover"); }}
        >
          <span className="mbn-icon">🏠</span>
          <span className="mbn-label">Discover</span>
        </button>
        <button
          className={page === "chat" && !viewingProfile ? "mbn-active" : ""}
          onClick={() => { setViewingProfile(null); setPage("chat"); }}
        >
          <span className="mbn-icon">
            💬
            {pendingIncomingRequests.length > 0 && <span className="mbn-badge">{pendingIncomingRequests.length}</span>}
          </span>
          <span className="mbn-label">Chat</span>
        </button>
        <button
          className={page === "sessions" && !viewingProfile ? "mbn-active" : ""}
          onClick={() => { setActiveChatUser(null); setViewingProfile(null); setSessionView(null); setSessionSummaryData(null); setPage("sessions"); }}
        >
          <span className="mbn-icon">
            📅
            {upcomingSessions.length > 0 && <span className="mbn-badge">{upcomingSessions.length}</span>}
          </span>
          <span className="mbn-label">Sessions</span>
        </button>
        <button
          className={page === "rewards" && !viewingProfile ? "mbn-active" : ""}
          onClick={() => { setActiveChatUser(null); setViewingProfile(null); setPage("rewards"); }}
        >
          <span className="mbn-icon">⭐</span>
          <span className="mbn-label">Rewards</span>
        </button>
        <button
          className={page === "profile" && !viewingProfile ? "mbn-active" : ""}
          onClick={() => { setActiveChatUser(null); setViewingProfile(null); setPage("profile"); }}
        >
          <span className="mbn-icon">👤</span>
          <span className="mbn-label">Profile</span>
        </button>
      </nav>

      {/* ─── Incoming Call Overlay ─── */}
      {incomingCall && (
        <div className="call-overlay incoming-call-overlay">
          <div className="call-overlay-card incoming-call-card">
            <div className="incoming-call-avatar">
              {(() => {
                const caller = findPerson(incomingCall.callerId);
                return caller?.avatar_url ? (
                  <img src={caller.avatar_url} alt={incomingCall.callerName} />
                ) : (
                  incomingCall.callerName?.[0] || "?"
                );
              })()}
            </div>
            <h2 className="incoming-call-name">{incomingCall.callerName}</h2>
            <p className="incoming-call-type">
              {incomingCall.type === "video" ? "🎥 Video Calling You" : "📞 Voice Calling You"}
            </p>
            <div className="incoming-call-actions">
              <button className="call-action-btn accept-btn" onClick={acceptCall}>
                <span className="call-action-icon">✅</span>
                <span>Accept</span>
              </button>
              <button className="call-action-btn decline-btn" onClick={declineCall}>
                <span className="call-action-icon">❌</span>
                <span>Decline</span>
              </button>
            </div>
            {callError && <p className="call-error-msg">{callError}</p>}
          </div>
        </div>
      )}

      {/* ─── Active Call Overlay ─── */}
      {callState && (
        <div className={`call-overlay active-call-overlay ${callState.type}`}>
          {callState.type === "video" && (
            <div className="video-call-container">
              <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
              <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
            </div>
          )}

          {callState.type === "voice" && (
            <div className="voice-call-container">
              <div className="voice-call-avatar">
                {(() => {
                  const otherId =
                    callState.callerId === session?.user?.id
                      ? callState.receiverId
                      : callState.callerId;
                  const other = findPerson(otherId);
                  return other?.avatar_url ? (
                    <img src={other.avatar_url} alt="" />
                  ) : (
                    getName(other || profile)?.[0] || "?"
                  );
                })()}
              </div>
              <h2 className="call-status-name">
                {callState.callerId === session?.user?.id
                  ? getName(findPerson(callState.receiverId) || profile)
                  : callState.callerName}
              </h2>
            </div>
          )}

          <div className="call-status-bar">
            <span className={`call-status-dot ${callState.status}`} />
            <span className="call-status-text">
              {callState.status === "calling" && "Calling..."}
              {callState.status === "accepted" && "Connecting..."}
              {callState.status === "connected" && formatCallDuration(callDuration)}
            </span>
          </div>

          <div className="call-controls">
            <button
              className={`call-control-btn ${isMuted ? "active" : ""}`}
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? "🔇" : "🎤"}
            </button>

            {callState.type === "voice" && (
              <button
                className={`call-control-btn ${isSpeakerOn ? "active" : ""}`}
                onClick={toggleSpeaker}
                title={isSpeakerOn ? "Speaker Off" : "Speaker On"}
              >
                {isSpeakerOn ? "🔊" : "🔈"}
              </button>
            )}

            {callState.type === "video" && (
              <>
                <button
                  className={`call-control-btn ${!isCameraOn ? "active" : ""}`}
                  onClick={toggleCamera}
                  title={isCameraOn ? "Camera Off" : "Camera On"}
                >
                  {isCameraOn ? "📹" : "📷"}
                </button>
                <button
                  className={`call-control-btn ${isSpeakerOn ? "active" : ""}`}
                  onClick={toggleSpeaker}
                  title={isSpeakerOn ? "Speaker Off" : "Speaker On"}
                >
                  {isSpeakerOn ? "🔊" : "🔈"}
                </button>
              </>
            )}

            <button
              className="call-control-btn end-call-btn"
              onClick={() => endCall("ended")}
              title="End Call"
            >
              📵
            </button>
          </div>

          {callError && <p className="call-error-msg">{callError}</p>}
        </div>
      )}

      {page !== "chat" && (
        <footer>
          <div className="footer-inner">
            <div>
              <div className="footer-brand">✦ SkillSwap</div>
              <p>Learn from people. Teach what you love.</p>
            </div>

            <span>Built for real-time peer learning and skill exchanges.</span>
          </div>
        </footer>
      )}

      {/* ─── Rewarded Ad Modal ─── */}
      {showAdModal && (
        <div className="modal-overlay" onClick={() => { if (adState !== "playing") setShowAdModal(false); }}>
          <div className="modal-card ad-modal" onClick={e => e.stopPropagation()}>
            <div className="ad-modal-header">
              <h2>🎁 Earn SkillSwap Points</h2>
              <p>Watch {ADS_FOR_REWARD} rewarded ads</p>
            </div>
            <div className="ad-modal-body">
              <div className="ad-progress-indicator">
                <span className="ad-progress-step done">✓</span>
                <span className={`ad-progress-step ${adNumber >= 2 ? "done" : ""}`}>2</span>
              </div>
              <div className="ad-current-label">Ad {Math.min(adNumber, ADS_FOR_REWARD)} of {ADS_FOR_REWARD}</div>
              <div className="ad-reward-label">Reward: 🪙 +{POINTS_PER_AD} Points</div>

              {adState === "idle" && (
                <div className="ad-waiting">
                  <p>Preparing ad...</p>
                </div>
              )}

              {adState === "playing" && (
                <div className="ad-playing-area">
                  <div className="ad-demo-container">
                    <div className="ad-demo-label">Demo Rewarded Ad</div>
                    <div className="ad-demo-content">
                      <div className="ad-demo-icon">📺</div>
                      <p>This is a demo rewarded ad.</p>
                      <p className="ad-demo-sub">Your reward will be unlocked after the ad is completed.</p>
                    </div>
                    <div className="ad-demo-countdown">
                      <span className="ad-countdown-num">{adCountdown}</span>
                    </div>
                  </div>
                  <button className="danger-button ad-skip-btn" onClick={handleAdSkip}>
                    Skip Ad
                  </button>
                </div>
              )}

              {adState === "completed" && (
                <div className="ad-completed-area">
                  <div className="ad-completed-icon">✓</div>
                  <p className="ad-completed-text">Ad completed</p>
                  <p className="ad-completed-points">+{POINTS_PER_AD} Points</p>
                  <button className="primary-button" onClick={handleAdComplete}>
                    {adNumber >= ADS_FOR_REWARD ? "🎉 Claim Reward" : "Continue →"}
                  </button>
                </div>
              )}

              {adState === "skipped" && (
                <div className="ad-skipped-area">
                  <div className="ad-skipped-icon">✕</div>
                  <p>Ad was not completed. No points were awarded.</p>
                  <button className="secondary-button" onClick={() => setShowAdModal(false)}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Reward Success Modal ─── */}
      {showRewardSuccess && (
        <div className="modal-overlay" onClick={() => setShowRewardSuccess(false)}>
          <div className="modal-card reward-success-modal" onClick={e => e.stopPropagation()}>
            <div className="reward-success-icon">🎉</div>
            <h2>Congratulations!</h2>
            <p>You earned:</p>
            <div className="reward-success-amount">🪙 +{TOTAL_AD_REWARD} SkillSwap Points</div>
            <p className="reward-success-balance">Your new balance: <strong>{skillPointsLocal} Points</strong></p>
            <button className="primary-button" onClick={() => { setShowRewardSuccess(false); setPage("sessions"); }}>
              Continue Learning →
            </button>
          </div>
        </div>
      )}

      {/* ─── Earn Points Modal (from session join) ─── */}
      {showEarnModal && (
        <div className="modal-overlay" onClick={() => setShowEarnModal(false)}>
          <div className="modal-card earn-modal" onClick={e => e.stopPropagation()}>
            <div className="earn-modal-icon">⚠️</div>
            <h2>Not enough points</h2>
            <p>You need {SESSION_COST - skillPointsLocal} more points.</p>
            <p className="earn-modal-balance">🪙 Current balance: {skillPointsLocal}</p>
            <div className="earn-modal-actions">
              <button className="secondary-button" onClick={() => setShowEarnModal(false)}>Cancel</button>
              <button className="primary-button" onClick={() => { setShowEarnModal(false); resetAdProgress(); setShowRewardsPage(true); setPage("rewards"); }}>
                🎁 Earn Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Points Wallet Popup ─── */}
      {showPointsPopup && (
        <div className="points-popup-overlay" onClick={() => setShowPointsPopup(false)}>
          <div className="points-popup" onClick={e => e.stopPropagation()}>
            <div className="points-popup-header">
              <h3>🪙 SkillSwap Rewards</h3>
              <button className="modal-close" onClick={() => setShowPointsPopup(false)}>×</button>
            </div>
            <div className="points-popup-body">
              <div className="points-popup-balance">
                <span className="points-popup-icon">🪙</span>
                <span className="points-popup-num">{skillPointsLocal}</span>
                <span className="points-popup-label">Points</span>
              </div>
              <p className="points-popup-desc">Use your points to learn, teach and connect.</p>
              <div className="points-popup-actions">
                <button className="points-popup-action" onClick={() => { setShowPointsPopup(false); setPage("sessions"); }}>
                  <span className="pp-action-icon">🎓</span>
                  <span>Learn</span>
                </button>
                <button className="points-popup-action" onClick={() => { setShowPointsPopup(false); setPage("sessions"); }}>
                  <span className="pp-action-icon">🔄</span>
                  <span>Skill Swap</span>
                </button>
                <button className="points-popup-action" onClick={() => { setShowPointsPopup(false); setPage("rewards"); }}>
                  <span className="pp-action-icon">🏆</span>
                  <span>Rewards</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Image Lightbox ─── */}
      {lightboxUrl && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)", display: "flex",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: "20px",
          }}
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Full size"
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              borderRadius: "8px", objectFit: "contain",
            }}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: "absolute", top: "16px", right: "16px",
              background: "rgba(255,255,255,0.2)", border: "none",
              color: "white", fontSize: "24px", cursor: "pointer",
              borderRadius: "50%", width: "40px", height: "40px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ─── Camera Modal ─── */}
      {showCameraModal && (
        <div className="camera-modal-overlay" onClick={closeCamera}>
          <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="camera-modal-header">
              <button className="camera-modal-close" onClick={closeCamera}>×</button>
              <div className="camera-mode-toggle">
                <button
                  className={`camera-mode-btn ${cameraMode === "photo" ? "active" : ""}`}
                  onClick={() => { setCameraMode("photo"); if (isRecordingVideo) toggleVideoRecording(); }}
                >
                  Photo
                </button>
                <button
                  className={`camera-mode-btn ${cameraMode === "video" ? "active" : ""}`}
                  onClick={() => setCameraMode("video")}
                >
                  Video
                </button>
              </div>
            </div>

            <div className="camera-modal-body">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="camera-preview-video"
              />
              <canvas ref={cameraCanvasRef} style={{ display: "none" }} />
            </div>

            <div className="camera-modal-footer">
              {cameraMode === "photo" ? (
                <button className="camera-capture-btn" onClick={capturePhoto}>
                  <div className="camera-capture-ring" />
                </button>
              ) : (
                <button
                  className={`camera-capture-btn ${isRecordingVideo ? "recording" : ""}`}
                  onClick={toggleVideoRecording}
                >
                  <div className={`camera-capture-ring ${isRecordingVideo ? "recording" : ""}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}