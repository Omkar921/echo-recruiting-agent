"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SESSION_STORAGE_KEY, SESSION_VERSION } from "@/lib/session/keys";
import { normalizePersonaName } from "@/lib/agent/display-name";
import { companyNamesMatch } from "@/lib/session/align";
import type {
  AgentIntent,
  AgentPersona,
  CandidateModel,
  CompanyContext,
  CompanyIntelligence,
  CallReport,
  ConversationMessage,
  ConversationState,
  ConversationStatus,
  EngagementDraft,
  MockCandidateProfile,
  SequenceStep,
  UserProfile,
} from "@/lib/types";
import { EMPTY_CANDIDATE_MODEL } from "@/lib/types";

const emptyConversation: ConversationState = {
  status: "drafting",
  statusReason: "",
  messages: [],
};

const clearedEngagement = {
  intent: null,
  sequence: [],
  matchedCandidate: null,
  candidateModel: EMPTY_CANDIDATE_MODEL,
  conversation: emptyConversation,
  engagementDraft: null as EngagementDraft | null,
  callReport: null as CallReport | null,
};

/** Wipe company + agent identity (persona, intelligence, context). */
const clearedCompany = {
  companyContext: null as CompanyContext | null,
  companyIntelligence: null as CompanyIntelligence | null,
  persona: null as AgentPersona | null,
};

const agentSlice = {
  companyContext: null as CompanyContext | null,
  companyIntelligence: null as CompanyIntelligence | null,
  persona: null as AgentPersona | null,
  intent: null as AgentIntent | null,
  sequence: [] as SequenceStep[],
  matchedCandidate: null as MockCandidateProfile | null,
  candidateModel: EMPTY_CANDIDATE_MODEL,
  conversation: emptyConversation,
  engagementDraft: null as EngagementDraft | null,
  callReport: null as CallReport | null,
};

interface EchoState {
  profile: UserProfile | null;
  companyContext: CompanyContext | null;
  companyIntelligence: CompanyIntelligence | null;
  persona: AgentPersona | null;
  intent: AgentIntent | null;
  sequence: SequenceStep[];
  matchedCandidate: MockCandidateProfile | null;
  candidateModel: CandidateModel;
  conversation: ConversationState;
  engagementDraft: EngagementDraft | null;
  callReport: CallReport | null;
  setProfile: (profile: UserProfile) => void;
  setCompanyContext: (context: CompanyContext) => void;
  setCompanyIntelligence: (intelligence: CompanyIntelligence) => void;
  setPersona: (persona: AgentPersona) => void;
  setIntent: (intent: AgentIntent) => void;
  setSequence: (sequence: SequenceStep[]) => void;
  setMatchedCandidate: (candidate: MockCandidateProfile | null) => void;
  setCandidateModel: (model: CandidateModel) => void;
  setEngagementDraft: (draft: EngagementDraft | null) => void;
  setCallReport: (report: CallReport | null) => void;
  resetEngagement: () => void;
  clearLiveConversation: () => void;
  purgeStaleEngagement: (sessionKey: string | null) => void;
  resetAgent: () => void;
  startNewCompany: () => void;
  removeMessage: (id: string) => void;
  addMessage: (message: ConversationMessage) => void;
  setStatus: (status: ConversationStatus, reason: string) => void;
  resetAll: () => void;
}

export const useEchoStore = create<EchoState>()(
  persist(
    (set) => ({
      profile: null,
      ...agentSlice,
      setProfile: (profile) =>
        set((s) => {
          const companyChanged = Boolean(
            s.profile?.companyName &&
              !companyNamesMatch(s.profile.companyName, profile.companyName),
          );
          if (!companyChanged) {
            return { profile };
          }
          return {
            profile,
            ...clearedCompany,
            ...clearedEngagement,
          };
        }),
      setCompanyContext: (companyContext) =>
        set((s) => {
          const prev = s.companyContext;
          const changed =
            Boolean(prev) &&
            JSON.stringify(prev) !== JSON.stringify(companyContext);
          if (!changed) return { companyContext };
          return {
            companyContext,
            ...clearedEngagement,
            persona: null,
            companyIntelligence: null,
          };
        }),
      setCompanyIntelligence: (companyIntelligence) => set({ companyIntelligence }),
      setPersona: (persona) =>
        set((s) => {
          const normalized = normalizePersonaName(persona, s.profile?.companyName);
          const prev = s.persona;
          const changed =
            Boolean(prev) && JSON.stringify(prev) !== JSON.stringify(normalized);
          if (!changed) return { persona: normalized };
          return { persona: normalized, ...clearedEngagement };
        }),
      setIntent: (intent) => set({ intent }),
      setSequence: (sequence) => set({ sequence }),
      setMatchedCandidate: (matchedCandidate) => set({ matchedCandidate }),
      setCandidateModel: (candidateModel) => set({ candidateModel }),
      setEngagementDraft: (engagementDraft) => set({ engagementDraft }),
      setCallReport: (callReport) => set({ callReport }),
      resetEngagement: () => set(clearedEngagement),
      clearLiveConversation: () =>
        set({
          conversation: emptyConversation,
          candidateModel: EMPTY_CANDIDATE_MODEL,
          callReport: null,
        }),
      purgeStaleEngagement: (sessionKey) =>
        set((s) => {
          if (!sessionKey) return s;
          let next: EchoState | null = null;
          if (s.intent && s.intent.sessionKey !== sessionKey) {
            next = {
              ...s,
              intent: null,
              sequence: [],
              matchedCandidate: null,
              candidateModel: EMPTY_CANDIDATE_MODEL,
              conversation: emptyConversation,
              callReport: null,
            };
          }
          if (s.engagementDraft && s.engagementDraft.sessionKey !== sessionKey) {
            next = { ...(next ?? s), engagementDraft: null };
          }
          return next ?? s;
        }),
      resetAgent: () => set({ ...agentSlice }),
      startNewCompany: () => set({ profile: null, ...agentSlice }),
      removeMessage: (id) =>
        set((s) => ({
          conversation: {
            ...s.conversation,
            messages: s.conversation.messages.filter((m) => m.id !== id),
          },
        })),
      addMessage: (message) =>
        set((s) => ({
          conversation: {
            ...s.conversation,
            messages: [...s.conversation.messages, message],
          },
        })),
      setStatus: (status, statusReason) =>
        set((s) => ({ conversation: { ...s.conversation, status, statusReason } })),
      resetAll: () => set({ profile: null, ...agentSlice }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      version: SESSION_VERSION,
      migrate: (persisted, version) => {
        let state = persisted as EchoState;
        if (version < SESSION_VERSION) {
          if (version < 5) {
            state = { ...state, ...clearedEngagement, engagementDraft: null };
          } else if (version < 6) {
            return { profile: state.profile, ...agentSlice };
          } else if (version < 7) {
            if (state.persona && state.profile?.companyName) {
              state = {
                ...state,
                persona: normalizePersonaName(state.persona, state.profile.companyName),
              };
            }
            state = { ...state, ...clearedEngagement };
          } else if (version < 8) {
            state = { ...state, callReport: null };
          }
        }
        if (state.intent && !state.intent.sessionKey) {
          return { ...state, ...clearedEngagement };
        }
        return { ...state, engagementDraft: state.engagementDraft ?? null, callReport: state.callReport ?? null };
      },
    },
  ),
);
