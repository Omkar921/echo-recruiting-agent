"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { useStaleSessionPurge } from "@/hooks/use-stale-session-purge";
import { CameraPreview } from "@/components/engagement/camera-preview";
import { CallReportCard } from "@/components/engagement/call-report-card";
import { CandidatePicker } from "@/components/engagement/candidate-picker";
import { GlobePanel } from "@/components/engagement/globe-panel";
import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { PhaseLayout } from "@/components/layout/phase-layout";
import { SourcingAnimation } from "@/components/engagement/sourcing-animation";
import { ThinkingDots } from "@/components/engagement/thinking-dots";
import { CALL_PURPOSE_OPTIONS } from "@/lib/agent/call-purpose";
import { MAX_CANDIDATE_TURNS } from "@/lib/agent/constants";
import { useAgentDisplayName } from "@/hooks/use-agent-display-name";
import { agentAvatarLabel } from "@/lib/agent/display-name";
import { sourceCandidatesForRole, candidateFirstName } from "@/lib/candidates/mock-pool";
import { buildAgentSessionKey, isAgentReady, isEngagementForSession } from "@/lib/session/keys";
import { useEchoStore } from "@/lib/session/store";
import type { AgentIntent, CallPurpose, CallReport, ConversationMessage, MockCandidateProfile } from "@/lib/types";
import { EMPTY_CANDIDATE_MODEL } from "@/lib/types";
import { resolveVoiceProfile } from "@/lib/voice/profile";
import { useSpeechToText, useTextToSpeech } from "@/hooks/use-speech";

const STATUS_LABEL: Record<string, { label: string; dot: string; text: string }> = {
  drafting: { label: "Drafting", dot: "bg-muted", text: "text-muted" },
  engaging: { label: "Engaging", dot: "bg-yellow-400", text: "text-yellow-300" },
  call_proposed: { label: "Call proposed", dot: "bg-green-400", text: "text-green-300" },
  nurture: { label: "Nurture", dot: "bg-blue-400", text: "text-blue-300" },
  not_a_fit: { label: "Not a fit", dot: "bg-red-400", text: "text-red-300" },
  completed: { label: "Call ended", dot: "bg-muted", text: "text-muted" },
};

type PagePhase = "intent" | "sourcing" | "pick" | "preflight" | "conversation";

type SourcingState = {
  intent: AgentIntent;
  scanned: MockCandidateProfile[];
  shortlist: MockCandidateProfile[];
};

type SequenceResult = {
  sequence: { id: string; goal: string; content: string }[];
  openingRationale: string;
};

function intentsEqual(a: AgentIntent, b: AgentIntent): boolean {
  return (
    a.roleName === b.roleName &&
    a.jobDescription === b.jobDescription &&
    a.requirements === b.requirements &&
    a.goal === b.goal &&
    a.callPurpose === b.callPurpose &&
    (a.callPurposeNotes ?? "") === (b.callPurposeNotes ?? "")
  );
}

const PHASE_BACK_LABEL: Record<PagePhase, string> = {
  intent: "Dashboard",
  sourcing: "Edit role",
  pick: "Sourcing results",
  preflight: "Choose candidate",
  conversation: "Before the call",
};

const FLOW_STEPS: { phase: PagePhase; label: string }[] = [
  { phase: "intent", label: "Role" },
  { phase: "sourcing", label: "Source" },
  { phase: "pick", label: "Pick" },
  { phase: "preflight", label: "Review" },
  { phase: "conversation", label: "Call" },
];

function phaseIndex(phase: PagePhase): number {
  return FLOW_STEPS.findIndex((s) => s.phase === phase);
}

function readPersistedAgentUi() {
  const state = useEchoStore.getState();
  const sessionKey = buildAgentSessionKey(
    state.profile?.companyName,
    state.companyContext,
    state.persona,
  );
  const draft =
    state.engagementDraft?.sessionKey === sessionKey ? state.engagementDraft : null;
  const liveIntent =
    state.intent && sessionKey && isEngagementForSession(state.intent, sessionKey)
      ? state.intent
      : null;
  const pagePhase: PagePhase =
    liveIntent && state.conversation.messages.length > 0
      ? "conversation"
      : (draft?.pagePhase ?? "intent");

  return { draft, pagePhase };
}

export default function AgentConversationPage() {
  const ready = useStoreHydrated();
  if (!ready) return null;
  return <AgentConversationContent />;
}

function AgentConversationContent() {
  const router = useRouter();
  const company = useEchoStore((s) => s.companyContext);
  const companyIntelligence = useEchoStore((s) => s.companyIntelligence);
  const profile = useEchoStore((s) => s.profile);
  const persona = useEchoStore((s) => s.persona);
  const agentName = useAgentDisplayName();
  const intent = useEchoStore((s) => s.intent);
  const sequence = useEchoStore((s) => s.sequence);
  const matchedCandidate = useEchoStore((s) => s.matchedCandidate);
  const candidateModel = useEchoStore((s) => s.candidateModel);
  const conversation = useEchoStore((s) => s.conversation);
  const setIntent = useEchoStore((s) => s.setIntent);
  const setSequence = useEchoStore((s) => s.setSequence);
  const setMatchedCandidate = useEchoStore((s) => s.setMatchedCandidate);
  const setCandidateModel = useEchoStore((s) => s.setCandidateModel);
  const addMessage = useEchoStore((s) => s.addMessage);
  const setStatus = useEchoStore((s) => s.setStatus);
  const resetEngagement = useEchoStore((s) => s.resetEngagement);
  const clearLiveConversation = useEchoStore((s) => s.clearLiveConversation);
  const setEngagementDraft = useEchoStore((s) => s.setEngagementDraft);
  const removeMessage = useEchoStore((s) => s.removeMessage);
  const engagementDraft = useEchoStore((s) => s.engagementDraft);
  const callReport = useEchoStore((s) => s.callReport);
  const setCallReport = useEchoStore((s) => s.setCallReport);

  const agentSessionKey = useMemo(
    () => buildAgentSessionKey(profile?.companyName, company, persona),
    [profile?.companyName, company, persona],
  );

  const persistedUi = useMemo(() => readPersistedAgentUi(), []);

  const savedDraft =
    engagementDraft?.sessionKey === agentSessionKey ? engagementDraft : null;

  const [pagePhase, setPagePhase] = useState<PagePhase>(persistedUi.pagePhase);
  const [sourcing, setSourcing] = useState<SourcingState | null>(
    () => persistedUi.draft?.sourcing ?? null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => persistedUi.draft?.selectedId ?? null,
  );
  const [roleName, setRoleName] = useState(() => persistedUi.draft?.roleName ?? "");
  const [jobDescription, setJobDescription] = useState(
    () => persistedUi.draft?.jobDescription ?? "",
  );
  const [requirements, setRequirements] = useState(
    () => persistedUi.draft?.requirements ?? "",
  );
  const [goal, setGoal] = useState(() => persistedUi.draft?.goal ?? "");
  const [callPurpose, setCallPurpose] = useState<CallPurpose>(
    () => persistedUi.draft?.callPurpose ?? "intro",
  );
  const [callPurposeNotes, setCallPurposeNotes] = useState(
    () => persistedUi.draft?.callPurposeNotes ?? "",
  );
  const [roleInputUrl, setRoleInputUrl] = useState("");
  const [rolePasteText, setRolePasteText] = useState("");
  const [parsingRole, setParsingRole] = useState(false);
  const [roleParseSource, setRoleParseSource] = useState<string | null>(null);
  const [roleSuggestedFields, setRoleSuggestedFields] = useState<
    Set<"requirements" | "goal">
  >(new Set());
  const [pendingEngagement, setPendingEngagement] = useState<{
    intent: AgentIntent;
    candidate: MockCandidateProfile;
    sequenceResult: SequenceResult;
  } | null>(() => persistedUi.draft?.pendingEngagement ?? null);
  const [planning, setPlanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidateInput, setCandidateInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [showReasoning, setShowReasoning] = useState(false);
  const [sourcingInstant, setSourcingInstant] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenIds = useRef<Set<string>>(new Set());
  const roleSeeded = useRef(false);
  const sendingRef = useRef(false);
  const respondEpochRef = useRef(0);
  const spokenSeededRef = useRef(false);
  const lastSessionKeyRef = useRef<string | null>(null);
  const sendReplyRef = useRef<(text: string) => void>(() => {});
  const voiceProfile = useMemo(
    () => (company && persona ? resolveVoiceProfile(company, persona) : null),
    [company, persona],
  );
  const tts = useTextToSpeech(voiceProfile);

  const stt = useSpeechToText((text) => setCandidateInput(text), {
    autoSend: true,
    onFinalTranscript: (text) => sendReplyRef.current(text),
  });

  useEffect(() => {
    if (!isAgentReady(company, persona)) {
      router.replace(profile ? "/onboarding" : "/login");
    }
  }, [company, persona, profile, router]);

  const resetLocalRoleForm = useCallback(() => {
    setRoleName("");
    setJobDescription("");
    setRequirements("");
    setGoal("");
    setCallPurpose("intro");
    setCallPurposeNotes("");
    setRoleInputUrl("");
    setRolePasteText("");
    setRoleParseSource(null);
    setRoleSuggestedFields(new Set());
    setSourcing(null);
    setSelectedId(null);
    setPendingEngagement(null);
    setCandidateInput("");
    setSourcingInstant(false);
    spokenIds.current.clear();
  }, []);

  const buildSourcingState = useCallback(
    (roleIntent: AgentIntent): SourcingState | null => {
      if (!company) return null;
      const { scanned, shortlist } = sourceCandidatesForRole(
        roleIntent.roleName,
        roleIntent.jobDescription,
        company,
        roleIntent.requirements,
        profile?.companyName,
        companyIntelligence,
      );
      return { intent: roleIntent, scanned, shortlist };
    },
    [company, profile?.companyName, companyIntelligence],
  );

  const invalidateRespondRequests = useCallback(() => {
    respondEpochRef.current += 1;
    sendingRef.current = false;
    setThinking(false);
  }, []);

  const stopLiveSession = useCallback(() => {
    tts.cancel();
    if (stt.listening) stt.stop();
    setCandidateInput("");
    invalidateRespondRequests();
    spokenIds.current.clear();
    spokenSeededRef.current = false;
    clearLiveConversation();
  }, [tts, stt, clearLiveConversation, invalidateRespondRequests]);

  useStaleSessionPurge(agentSessionKey);

  useEffect(() => {
    if (!agentSessionKey) return;
    if (lastSessionKeyRef.current && lastSessionKeyRef.current !== agentSessionKey) {
      resetLocalRoleForm();
      setPagePhase("intent");
      setEngagementDraft(null);
      setCallReport(null);
      roleSeeded.current = false;
    }
    lastSessionKeyRef.current = agentSessionKey;
  }, [agentSessionKey, resetLocalRoleForm, setEngagementDraft]);

  const validIntent = useMemo(
    () =>
      intent && agentSessionKey && isEngagementForSession(intent, agentSessionKey)
        ? intent
        : null,
    [intent, agentSessionKey],
  );

  const candidateTurnCount = useMemo(
    () => conversation.messages.filter((m) => m.role === "candidate").length,
    [conversation.messages],
  );

  const callEnded = conversation.status === "completed";
  const canReply =
    !callEnded &&
    !generatingReport &&
    candidateTurnCount < MAX_CANDIDATE_TURNS &&
    !thinking;

  const activePhase: PagePhase =
    pagePhase === "conversation" && !validIntent ? "intent" : pagePhase;

  useEffect(() => {
    if (pagePhase === "conversation" && !validIntent) {
      setPagePhase(savedDraft?.pagePhase ?? "intent");
    }
  }, [pagePhase, validIntent, savedDraft?.pagePhase]);

  useEffect(() => {
    if (roleSeeded.current || savedDraft || !validIntent) return;
    roleSeeded.current = true;
    setRoleName(validIntent.roleName);
    setJobDescription(validIntent.jobDescription);
    setRequirements(validIntent.requirements);
    setGoal(validIntent.goal);
    setCallPurpose(validIntent.callPurpose);
    setCallPurposeNotes(validIntent.callPurposeNotes ?? "");
  }, [savedDraft, validIntent]);

  const handlePhaseBack = useCallback(() => {
    if (callEnded) return;
    setError(null);

    switch (activePhase) {
      case "conversation": {
        const openingRationale =
          conversation.messages.find((m) => m.role === "agent")?.reasoning?.rationale ?? "";
        invalidateRespondRequests();
        tts.cancel();
        if (stt.listening) stt.stop();
        setCandidateInput("");
        spokenIds.current.clear();
        spokenSeededRef.current = false;
        clearLiveConversation();
        const liveIntent = validIntent;
        const candidate = matchedCandidate;
        if (liveIntent && candidate) {
          if (!sourcing) {
            const rebuilt = buildSourcingState(liveIntent);
            if (rebuilt) setSourcing(rebuilt);
          }
          setSelectedId(candidate.id);
          setPendingEngagement({
            intent: liveIntent,
            candidate,
            sequenceResult: {
              sequence,
              openingRationale,
            },
          });
          setPagePhase("preflight");
        } else {
          setPagePhase("pick");
        }
        return;
      }
      case "preflight":
        setPendingEngagement(null);
        setPagePhase("pick");
        return;
      case "pick": {
        setPendingEngagement(null);
        setSourcingInstant(true);
        const roleIntent = sourcing?.intent ?? validIntent;
        if (roleIntent && !sourcing) {
          const rebuilt = buildSourcingState(roleIntent);
          if (rebuilt) setSourcing(rebuilt);
        }
        setPagePhase("sourcing");
        return;
      }
      case "sourcing":
        setSourcing(null);
        setSourcingInstant(false);
        setPendingEngagement(null);
        setPagePhase("intent");
        return;
      case "intent":
      default:
        router.push("/dashboard");
    }
  }, [
    activePhase,
    buildSourcingState,
    callEnded,
    clearLiveConversation,
    conversation.messages,
    invalidateRespondRequests,
    matchedCandidate,
    router,
    sequence,
    sourcing,
    stt,
    tts,
    validIntent,
  ]);

  useEffect(() => {
    if (!agentSessionKey || activePhase === "conversation") return;
    if (sourcing && !isEngagementForSession(sourcing.intent, agentSessionKey)) return;
    if (
      pendingEngagement &&
      !isEngagementForSession(pendingEngagement.intent, agentSessionKey)
    ) {
      return;
    }
    setEngagementDraft({
      sessionKey: agentSessionKey,
      pagePhase: activePhase,
      roleName,
      jobDescription,
      requirements,
      goal,
      callPurpose,
      callPurposeNotes,
      sourcing,
      selectedId,
      pendingEngagement,
    });
  }, [
    agentSessionKey,
    activePhase,
    roleName,
    jobDescription,
    requirements,
    goal,
    callPurpose,
    callPurposeNotes,
    sourcing,
    selectedId,
    pendingEngagement,
    setEngagementDraft,
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [conversation.messages.length, thinking]);

  const speakMessage = useCallback(
    (msg: ConversationMessage) => {
      if (!voiceOn || msg.role !== "agent" || spokenIds.current.has(msg.id)) return;
      spokenIds.current.add(msg.id);
      setTimeout(() => tts.speak(msg.content), 80);
    },
    [voiceOn, tts],
  );

  useEffect(() => {
    if (activePhase !== "conversation") return;
    const last = conversation.messages[conversation.messages.length - 1];
    if (last?.role === "agent") speakMessage(last);
  }, [conversation.messages, activePhase, speakMessage]);

  useEffect(() => {
    if (activePhase !== "conversation" || spokenSeededRef.current) return;
    if (conversation.messages.length === 0) return;
    for (const message of conversation.messages) {
      if (message.role === "agent") spokenIds.current.add(message.id);
    }
    spokenSeededRef.current = true;
  }, [activePhase, conversation.messages]);

  const beginConversation = useCallback(
    (
      engagementIntent: AgentIntent,
      candidate: MockCandidateProfile,
      apiResult: SequenceResult,
      greeting: string,
      greetingRationale: string,
    ) => {
      if (!persona) return;

      const openerId = `msg-${Date.now()}`;
      spokenIds.current.clear();
      spokenSeededRef.current = false;

      setIntent({
        ...engagementIntent,
        sessionKey: engagementIntent.sessionKey ?? agentSessionKey ?? undefined,
      });
      setMatchedCandidate(candidate);
      setSequence(apiResult.sequence);
      setCandidateModel(EMPTY_CANDIDATE_MODEL);

      const opener: ConversationMessage = {
        id: openerId,
        role: "agent",
        content: greeting,
        reasoning: {
          classification: "Call connected",
          conversationStage: "rapport",
          nextBeat: "Rapport — greet, ask how they are, congratulate on match",
          decision: `Start live call with ${candidate.name}`,
          rationale: greetingRationale,
          agentDriven: true,
        },
        createdAt: new Date().toISOString(),
      };

      addMessage(opener);
      setStatus("engaging", `${agentName} is on a call with ${candidate.name}`);
      setPagePhase("conversation");
      setSourcing(null);
      setPendingEngagement(null);
      setPlanning(false);
      setStarting(false);
      setEngagementDraft(null);
      setCallReport(null);
      speakMessage(opener);
    },
    [agentName, persona, agentSessionKey, setIntent, setMatchedCandidate, setSequence, setCandidateModel, addMessage, setStatus, setEngagementDraft, setCallReport, speakMessage],
  );

  async function handleRoleParse(from: "url" | "paste") {
    if (!company || parsingRole) return;
    if (from === "url" && !roleInputUrl.trim()) return;
    if (from === "paste" && !rolePasteText.trim()) return;

    setParsingRole(true);
    setError(null);
    setRoleParseSource(null);

    try {
      const res = await fetch("/api/role/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(from === "url" ? { url: roleInputUrl.trim() } : { text: rolePasteText.trim() }),
          company,
          companyName: profile?.companyName,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Could not parse that job posting.");
      }

      setRoleName(body.roleName ?? "");
      setJobDescription(body.jobDescription ?? "");
      setRequirements(body.requirements ?? "");
      setGoal(body.goal ?? "");
      setRoleSuggestedFields(new Set(body.suggestedFields ?? []));
      setRoleParseSource(body.source ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse job posting.");
    } finally {
      setParsingRole(false);
    }
  }

  function clearRoleSuggestion(field: "requirements" | "goal") {
    setRoleSuggestedFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  async function handleIntentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company || !persona) return;
    if (!roleName.trim() || !jobDescription.trim() || !goal.trim()) return;

    const newIntent: AgentIntent = {
      roleName,
      jobDescription,
      requirements,
      goal,
      callPurpose,
      callPurposeNotes:
        callPurpose === "other" && callPurposeNotes.trim()
          ? callPurposeNotes.trim()
          : undefined,
      sessionKey: agentSessionKey ?? undefined,
    };

    const priorIntent = validIntent ?? sourcing?.intent ?? null;
    const roleChanged = priorIntent && !intentsEqual(priorIntent, newIntent);

    if (roleChanged) {
      resetEngagement();
    }

    setIntent(newIntent);
    setPendingEngagement(null);

    const { scanned, shortlist } = sourceCandidatesForRole(
      roleName,
      jobDescription,
      company,
      requirements,
      profile?.companyName,
      companyIntelligence,
    );

    setPlanning(true);
    setError(null);
    setSourcingInstant(false);
    setSelectedId(shortlist[0]?.id ?? null);
    setSourcing({ intent: newIntent, scanned, shortlist });
    setPagePhase("sourcing");
    setPlanning(false);
  }

  function finishSourcing() {
    setSourcingInstant(false);
    setPagePhase("pick");
  }

  async function handleStartOutreach() {
    if (!company || !persona || !sourcing || !selectedId || !agentSessionKey) return;
    if (!isEngagementForSession(sourcing.intent, agentSessionKey)) {
      setError("This role is from a previous session. Go back and define the role again.");
      return;
    }
    const candidate = sourcing.shortlist.find((c) => c.id === selectedId);
    if (!candidate) return;

    setStarting(true);
    setError(null);

    try {
      const res = await fetch("/api/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          persona,
          intent: sourcing.intent,
          candidate,
          companyName: profile?.companyName,
          companyIntelligence,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Failed to plan outreach.");
      }
      const apiResult: SequenceResult = await res.json();
      setPendingEngagement({ intent: sourcing.intent, candidate, sequenceResult: apiResult });
      setPagePhase("preflight");
      setStarting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStarting(false);
    }
  }

  async function handlePreflightStart(startCall: boolean) {
    if (!startCall) {
      setPendingEngagement(null);
      setPagePhase("pick");
      return;
    }
    if (!company || !persona || !pendingEngagement) return;

    stopLiveSession();
    setStarting(true);
    setError(null);

    try {
      const { intent, candidate, sequenceResult } = pendingEngagement;
      const res = await fetch("/api/conversation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          persona,
          intent,
          candidate,
          companyName: profile?.companyName,
          companyIntelligence,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Failed to start conversation.");
      }
      const { greeting, rationale } = await res.json();
      beginConversation(intent, candidate, sequenceResult, greeting, rationale);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStarting(false);
    }
  }

  function handleNewEngagement() {
    invalidateRespondRequests();
    tts.cancel();
    if (stt.listening) stt.stop();
    resetEngagement();
    resetLocalRoleForm();
    setPagePhase("intent");
    setError(null);
    spokenSeededRef.current = false;
  }

  function draftReplyText() {
    return (candidateInput.trim() || stt.interim.trim());
  }

  const generateCallReportForMessages = useCallback(
    async (messages: ConversationMessage[]) => {
      if (!company || !persona || !validIntent || !matchedCandidate || messages.length === 0) {
        return;
      }
      setGeneratingReport(true);
      setError(null);
      try {
        const res = await fetch("/api/conversation/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company,
            persona,
            intent: validIntent,
            messages,
            candidateModel,
            candidate: matchedCandidate,
            companyName: profile?.companyName,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to generate report.");
        }
        const { report } = (await res.json()) as { report: CallReport };
        setCallReport(report);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not generate report.");
      } finally {
        setGeneratingReport(false);
      }
    },
    [
      company,
      persona,
      validIntent,
      matchedCandidate,
      candidateModel,
      profile?.companyName,
      setCallReport,
    ],
  );

  const handleEndCall = useCallback(async () => {
    if (!company || !persona || !validIntent || !matchedCandidate || generatingReport) return;
    if (callEnded && callReport) return;

    tts.cancel();
    if (stt.listening) stt.stop();
    setCandidateInput("");

    if (callEnded && !callReport) {
      await generateCallReportForMessages(conversation.messages);
      return;
    }

    if (thinking || sendingRef.current) return;

    setStatus("completed", "Call ended — generating scorecard");
    await generateCallReportForMessages(conversation.messages);
  }, [
    company,
    persona,
    validIntent,
    matchedCandidate,
    generatingReport,
    callEnded,
    callReport,
    thinking,
    tts,
    stt,
    setStatus,
    conversation.messages,
    generateCallReportForMessages,
  ]);

  async function handleCandidateSend(textOverride?: string) {
    const text = (textOverride ?? draftReplyText()).trim();
    if (
      !text ||
      !company ||
      !persona ||
      !validIntent ||
      thinking ||
      sendingRef.current ||
      !canReply
    ) {
      return;
    }
    if (stt.listening) stt.stop();

    const epoch = respondEpochRef.current;
    sendingRef.current = true;
    const msgId = `msg-${Date.now()}`;
    const candidateMessage: ConversationMessage = {
      id: msgId,
      role: "candidate",
      content: text,
      createdAt: new Date().toISOString(),
    };
    addMessage(candidateMessage);
    setCandidateInput("");
    setThinking(true);
    setError(null);

    try {
      const res = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          persona,
          intent: validIntent,
          history: [...conversation.messages, candidateMessage],
          candidateReply: candidateMessage.content,
          candidateModel,
          sequence,
          candidate: matchedCandidate ?? undefined,
          companyName: profile?.companyName,
          companyIntelligence,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Failed to get a response.");
      }
      if (epoch !== respondEpochRef.current) return;

      const { analysis, decision, reply } = await res.json();
      setCandidateModel(analysis.candidateModel);
      const agentMessage: ConversationMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "agent",
        content: reply,
        reasoning: {
          classification: decision.classification,
          interpretation: `${analysis.likelyIntent} — ${analysis.emotionalTone}. They need: ${analysis.whatTheyNeed}`,
          signal: decision.signal,
          conversationStage: decision.conversationStage,
          nextBeat: decision.nextBeat,
          decision: decision.decision,
          rationale: decision.rationale,
          agentDriven: true,
        },
        createdAt: new Date().toISOString(),
      };
      addMessage(agentMessage);
      setStatus(decision.status, decision.statusReason);
      setShowReasoning(true);

      const fullTranscript = [...conversation.messages, candidateMessage, agentMessage];
      if (decision.status === "completed") {
        tts.cancel();
        if (stt.listening) stt.stop();
        void generateCallReportForMessages(fullTranscript);
      }
    } catch (err) {
      if (epoch !== respondEpochRef.current) return;
      removeMessage(msgId);
      setCandidateInput(text);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (epoch === respondEpochRef.current) {
        sendingRef.current = false;
        setThinking(false);
      }
    }
  }

  useEffect(() => {
    sendReplyRef.current = (text) => void handleCandidateSend(text);
  });

  if (!persona) return null;

  const lastAgentMessage = [...conversation.messages].reverse().find((m) => m.role === "agent" && m.reasoning);
  const statusInfo = STATUS_LABEL[conversation.status] ?? STATUS_LABEL.drafting;
  const inConversation = activePhase === "conversation" && validIntent;
  const currentStepIndex = phaseIndex(activePhase);
  const fieldClass =
    "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-foreground";

  return (
    <PageShell width="wide">
      <div className="flex items-center justify-between gap-4">
        {!callEnded && (
          <BackLink
            label={PHASE_BACK_LABEL[activePhase]}
            onClick={handlePhaseBack}
          />
        )}
        {callEnded && <div className="w-[72px]" />}
        <div className="hidden flex-1 justify-center sm:flex">
          <div className="flex items-center gap-1.5">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.phase} className="flex items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] transition ${
                    i === currentStepIndex
                      ? "bg-accent/20 text-foreground"
                      : i < currentStepIndex
                        ? "text-muted"
                        : "text-muted/50"
                  }`}
                >
                  {i < currentStepIndex ? "✓" : i + 1}. {step.label}
                </span>
                {i < FLOW_STEPS.length - 1 && (
                  <span className="text-[10px] text-border">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {inConversation && tts.supported && (
            <button
              type="button"
              onClick={() => { if (voiceOn) tts.cancel(); setVoiceOn((v) => !v); }}
              className="text-xs text-muted hover:text-foreground"
              title={voiceProfile ? `Voice: ${voiceProfile.label}` : undefined}
            >
              {voiceOn ? `🔊 ${tts.profileLabel}` : "🔇 Voice off"}
            </button>
          )}
          {inConversation && (
            <button type="button" onClick={handleNewEngagement} className="text-xs text-muted hover:text-foreground">
              New engagement
            </button>
          )}
        </div>
      </div>

      {activePhase === "intent" && (
        <div className="mt-8 grid w-full flex-1 gap-8 lg:grid-cols-2 lg:items-stretch">
          <div className="relative min-h-[320px] lg:min-h-[480px]">
            <GlobePanel
              title="Sourcing worldwide"
              subtitle={`${agentName} will scan profiles once you define the role`}
            />
          </div>
          <div className="flex flex-col justify-center lg:py-4">
            <PageHeader
              eyebrow="New engagement"
              title="Who are you hiring?"
              subtitle={`${agentName} will source candidates — you pick who to pursue, then preview the call as them.`}
            />
            <form onSubmit={handleIntentSubmit} className="mt-6 space-y-4">
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Auto-fill from job posting
                </p>
                <p className="mt-1 text-xs text-muted">
                  Paste a careers URL or the full job description — we&apos;ll fill the role
                  fields for you. Review before sourcing.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="url"
                    value={roleInputUrl}
                    onChange={(e) => setRoleInputUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleRoleParse("url");
                      }
                    }}
                    placeholder="careers page or job listing URL"
                    className={`${fieldClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => void handleRoleParse("url")}
                    disabled={parsingRole || !roleInputUrl.trim()}
                    className="shrink-0 rounded-full border border-border px-4 py-2.5 text-sm transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {parsingRole ? "Parsing…" : "Fetch"}
                  </button>
                </div>
                <p className="my-3 text-center text-[10px] uppercase tracking-wider text-muted">
                  or paste description
                </p>
                <textarea
                  rows={3}
                  value={rolePasteText}
                  onChange={(e) => setRolePasteText(e.target.value)}
                  placeholder="Paste the full job description here…"
                  className={`${fieldClass} resize-none`}
                />
                <button
                  type="button"
                  onClick={() => void handleRoleParse("paste")}
                  disabled={parsingRole || !rolePasteText.trim()}
                  className="mt-2 w-full rounded-full border border-border py-2 text-sm transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {parsingRole ? "Parsing…" : "Parse & fill fields"}
                </button>
                {roleParseSource && (
                  <p className="mt-2 text-xs text-muted">
                    Filled from{" "}
                    <span className="text-foreground">{roleParseSource}</span> — edit below if
                    needed.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-muted">Role</label>
                <input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Senior Full Stack Developer" className={fieldClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted">Job description</label>
                <textarea rows={2} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="What they'll own day-to-day" className={`${fieldClass} resize-none`} />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs text-muted">
                  Requirements
                  {roleSuggestedFields.has("requirements") && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                      AI suggested
                    </span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={requirements}
                  onChange={(e) => {
                    clearRoleSuggestion("requirements");
                    setRequirements(e.target.value);
                  }}
                  placeholder="5+ yrs React, remote OK, $160k"
                  className={`${fieldClass} resize-none`}
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs text-muted">
                  Your goal
                  {roleSuggestedFields.has("goal") && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                      AI suggested
                    </span>
                  )}
                </label>
                <input
                  value={goal}
                  onChange={(e) => {
                    clearRoleSuggestion("goal");
                    setGoal(e.target.value);
                  }}
                  placeholder="Get them on a call"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted">What kind of call is this?</label>
                <select
                  value={callPurpose}
                  onChange={(e) => setCallPurpose(e.target.value as CallPurpose)}
                  className={fieldClass}
                >
                  {CALL_PURPOSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-muted">
                  {
                    CALL_PURPOSE_OPTIONS.find((option) => option.value === callPurpose)
                      ?.description
                  }
                </p>
              </div>
              {callPurpose === "other" && (
                <div>
                  <label className="mb-1.5 block text-xs text-muted">Describe this call</label>
                  <textarea
                    rows={2}
                    value={callPurposeNotes}
                    onChange={(e) => setCallPurposeNotes(e.target.value)}
                    placeholder="e.g. Culture fit conversation with the hiring manager"
                    className={`${fieldClass} resize-none`}
                  />
                </div>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={planning} className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40">
                Source candidates →
              </button>
            </form>
          </div>
        </div>
      )}

      {activePhase === "sourcing" && sourcing && (
        <PhaseLayout width="md">
          <SourcingAnimation
            key={sourcingInstant ? `replay-${sourcing.intent.roleName}` : `run-${sourcing.intent.roleName}`}
            agentName={agentName}
            roleName={sourcing.intent.roleName}
            candidates={sourcing.scanned}
            matched={sourcing.shortlist[0]}
            onComplete={finishSourcing}
            instant={sourcingInstant}
          />
        </PhaseLayout>
      )}

      {activePhase === "pick" && sourcing && (
        <PhaseLayout width="lg">
          <CandidatePicker
            intent={sourcing.intent}
            candidates={sourcing.shortlist}
            selectedId={selectedId}
            onSelect={(c) => setSelectedId(c.id)}
            onStart={handleStartOutreach}
            starting={starting}
          />
          {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
        </PhaseLayout>
      )}

      {activePhase === "preflight" && pendingEngagement && (
        <PhaseLayout width="sm">
          <PageHeader
            align="center"
            eyebrow="Before the call"
            title={`Start conversation with ${candidateFirstName(pendingEngagement.candidate)}?`}
            subtitle={`${agentName} is ready to call ${pendingEngagement.candidate.name} about the ${pendingEngagement.intent.roleName} role${profile?.companyName ? ` at ${profile.companyName}` : ""}. You'll play the candidate once the call connects.`}
          />
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void handlePreflightStart(false)}
              disabled={starting}
              className="rounded-full border border-border px-6 py-2.5 text-sm hover:bg-surface disabled:opacity-40"
            >
              No, go back
            </button>
            <button
              type="button"
              onClick={() => void handlePreflightStart(true)}
              disabled={starting}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40"
            >
              {starting ? "Connecting…" : "Yes, start call"}
            </button>
          </div>
          {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
        </PhaseLayout>
      )}

      {inConversation && (
        <div className="mt-8 grid w-full flex-1 gap-5 lg:grid-cols-[1fr_280px] lg:items-start">
          <div className="flex min-h-[480px] flex-col rounded-xl border border-border bg-surface lg:min-h-[520px]">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-medium">
                  {agentAvatarLabel()}
                </div>
                <div>
                  <p className="text-sm font-medium">{agentName}</p>
                  <p className="text-[10px] text-muted">{validIntent.roleName}</p>
                </div>
              </div>
              <span className={`flex shrink-0 items-center gap-1.5 text-xs ${statusInfo.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
                {!callEnded && candidateTurnCount > 0 && (
                  <span className="text-muted">
                    · {candidateTurnCount}/{MAX_CANDIDATE_TURNS}
                  </span>
                )}
              </span>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {conversation.messages.map((m) => (
                <div key={m.id} className={`flex items-end gap-2 ${m.role === "candidate" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                    m.role === "agent" ? "bg-accent/20 text-accent" : "bg-foreground/10"
                  }`}>
                    {m.role === "agent" ? agentAvatarLabel() : matchedCandidate ? candidateFirstName(matchedCandidate).charAt(0) : "Y"}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === "agent" ? "bg-background border border-border" : "bg-accent text-black"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-[10px]">{agentAvatarLabel()}</div>
                  <div className="rounded-2xl border border-border bg-background px-3.5 py-2 text-sm text-muted">
                    <ThinkingDots label="Listening" />
                  </div>
                </div>
              )}
            </div>

            {error && <p className="px-5 text-sm text-red-400">{error}</p>}
            {stt.error && !error && (
              <p className="flex items-center justify-between gap-3 px-5 text-sm text-red-400">
                <span>{stt.error}</span>
                <button
                  type="button"
                  onClick={() => stt.clearError()}
                  className="shrink-0 text-xs text-muted underline hover:text-foreground"
                >
                  Dismiss
                </button>
              </p>
            )}

            {callEnded ? (
              <div className="border-t border-border px-5 py-4">
                <CallReportCard report={callReport} generating={generatingReport} />
                {!callReport && !generatingReport && (
                  <button
                    type="button"
                    onClick={() => void handleEndCall()}
                    className="mt-4 rounded-full border border-border px-5 py-2.5 text-sm hover:bg-surface"
                  >
                    Retry scorecard
                  </button>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleNewEngagement}
                    className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-black hover:opacity-90"
                  >
                    New engagement
                  </button>
                </div>
              </div>
            ) : (
            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <input
                  value={stt.listening ? stt.interim || candidateInput : candidateInput}
                  onChange={(e) => setCandidateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleCandidateSend();
                    }
                  }}
                  disabled={!canReply}
                  placeholder={
                    !canReply && candidateTurnCount >= MAX_CANDIDATE_TURNS
                      ? "Interview complete — end call to see report"
                      : !stt.supported
                      ? "Type your reply — mic not supported in this browser"
                      : stt.listening
                        ? "Speak now…"
                        : `Reply as ${matchedCandidate ? candidateFirstName(matchedCandidate) : "candidate"} — or tap mic`
                  }
                  className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!stt.supported) return;
                    if (stt.listening) {
                      stt.stop();
                    } else {
                      tts.cancel();
                      setCandidateInput("");
                      void stt.start();
                    }
                  }}
                  disabled={thinking || !stt.supported || !canReply}
                  title={
                    !stt.supported
                      ? "Speech recognition requires Chrome, Edge, or Safari"
                      : stt.listening
                        ? "Stop and send"
                        : "Speak reply"
                  }
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                    stt.listening
                      ? "border-red-400 bg-red-400/10 text-red-400 animate-pulse"
                      : stt.supported
                        ? "border-accent bg-accent text-black hover:opacity-90"
                        : "border-border bg-surface text-muted"
                  } disabled:opacity-40`}
                  aria-label={stt.listening ? "Stop and send" : "Speak reply"}
                >
                  {stt.listening ? "Done" : "🎤"}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-muted">
                {stt.supported
                  ? `Tap mic to speak — tap Done when finished to send. ${MAX_CANDIDATE_TURNS} exchanges max. Or type and press Enter as ${matchedCandidate ? candidateFirstName(matchedCandidate) : "the candidate"}.`
                  : "Use Chrome or Edge for voice input, or type your reply and press Enter."}
              </p>
            </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <CameraPreview autoStart label={matchedCandidate ? candidateFirstName(matchedCandidate) : "You"} />

            {matchedCandidate && (
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-[10px] uppercase tracking-wide text-muted">You&apos;re playing</p>
                <p className="mt-1 font-medium">{matchedCandidate.name}</p>
                <p className="text-xs text-muted">{matchedCandidate.headline}</p>
                <p className="mt-2 text-[10px] text-muted">{matchedCandidate.matchScore}% · {matchedCandidate.location}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleEndCall()}
              disabled={
                generatingReport ||
                (callEnded && Boolean(callReport)) ||
                conversation.messages.length < 2 ||
                thinking ||
                sendingRef.current
              }
              className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-left text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-40"
            >
              {generatingReport
                ? "Generating report…"
                : callEnded && !callReport
                  ? "Retry scorecard"
                  : "End call & view report"}
            </button>

            <button
              type="button"
              onClick={() => setShowReasoning((v) => !v)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-xs text-muted hover:text-foreground"
            >
              {showReasoning ? "Hide" : "Show"} agent reasoning
            </button>

            {showReasoning && lastAgentMessage?.reasoning && (
              <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-2">
                {lastAgentMessage.reasoning.agentDriven && (
                  <p className="text-[10px] uppercase tracking-wide text-accent">Agent engine · not LLM reasoning</p>
                )}
                <p><span className="text-muted">Read:</span> {lastAgentMessage.reasoning.classification}</p>
                {lastAgentMessage.reasoning.interpretation && (
                  <p><span className="text-muted">Understood:</span> {lastAgentMessage.reasoning.interpretation}</p>
                )}
                <p><span className="text-muted">Next:</span> {lastAgentMessage.reasoning.nextBeat ?? lastAgentMessage.reasoning.decision}</p>
              </div>
            )}

            {(callReport || generatingReport) && !callEnded && (
              <CallReportCard report={callReport} generating={generatingReport} />
            )}

            {(candidateModel.statedInterests.length > 0 || candidateModel.concerns.length > 0) && (
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-[10px] uppercase tracking-wide text-muted">Learned about you</p>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {candidateModel.statedInterests.map((item) => <li key={item}>+ {item}</li>)}
                  {candidateModel.concerns.map((item) => <li key={item}>? {item}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
