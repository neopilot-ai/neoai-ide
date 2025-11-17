"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TopicExplanation from '@/components/learn/topic_explanation';
import CodeExamples from '@/components/learn/code_examples';
import Assignments from '@/components/learn/assignments';
import Quiz from '@/components/learn/quiz';
import Verification from '@/components/learn/verification';
import Chat from '@/components/chat';
import RelatedTopics from '@/components/learn/related_topics';
import Flashcards from '@/components/learn/flash_cards';
import { useSession } from 'next-auth/react';
import { fetchTopicExplanation } from '@/app/lib/actions/learn/explanation';
import Login from '@/components/login';
import { getCodeExamples } from '@/app/lib/actions/learn/code_examples';
import { getAssignments } from '@/app/lib/actions/learn/assignments';
import { getRelatedTopics } from '@/app/lib/actions/learn/related_topics';
import Navbar from '@/components/navbar';
import { getQuiz, QuizQuestion } from '@/app/lib/actions/learn/quiz';
import { FlashCard, getFlashCards } from '@/app/lib/actions/learn/flashcards';
import { getVerification } from '@/app/lib/actions/learn/verification';
import { Learn } from '@/app/lib/actions/learn/learn';

const sections = [
  { id: 'explanation', title: 'Topic Explanation', component: TopicExplanation },
  { id: 'code-examples', title: 'Code Examples', component: CodeExamples },
  { id: 'assignments', title: 'Assignments', component: Assignments },
  { id: 'quiz', title: 'Quiz', component: Quiz },
  { id: 'verification', title: 'Verification', component: Verification },
  { id: 'flashcards', title: 'Flashcards', component: Flashcards },
  { id: 'related-topics', title: 'Related Topics', component: RelatedTopics },
];

interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export default function Main({ topic, level }: { topic: string; level: string }) {
  const [activeSection, setActiveSection] = useState('explanation');
  const { data: session } = useSession();
  const [explanation, setExplanation] = useState<string | undefined>();
  const [complexity, setComplexity] = useState('normal');
  const [codeExamples, setCodeExamples] = useState<string | undefined>();
  const [assignments, setAssignments] = useState<string | undefined>();
  const [relatedTopics, setRelatedTopics] = useState<string | undefined>();
  const [quiz, setQuiz] = useState<QuizQuestion[] | undefined>();
  const [flashCards, setFlashCards] = useState<FlashCard[] | undefined>();
  const [verificationFeedback, setVerificationFeedback] = useState<string | undefined>();
  const [chatContext, setChatContext] = useState<Learn>({
    topic: topic,
  });

  // Track loading and error states for each section
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({
    explanation: { isLoading: true },
    'code-examples': { isLoading: true },
    assignments: { isLoading: true },
    quiz: { isLoading: true },
    'related-topics': { isLoading: true },
    verification: { isLoading: false },
    flashcards: { isLoading: true },
  });

  const updateLoadingState = (
    sectionId: string,
    isLoading: boolean,
    error?: string
  ) => {
    setLoadingStates(prev => ({
      ...prev,
      [sectionId]: { isLoading, error }
    }));
  };

  function handleExplanationComplexityChange(newComplexity: string) {
    const background = localStorage.getItem('learningBackground') || '';
    setComplexity(newComplexity);
    setExplanation(undefined);
    fetchTopicExplanation(
      topic,
      level,
      background,
      newComplexity,
      explanation
    ).then(resp => {
      setChatContext((c) => ({
        ...c,
        explanation: resp
      }));
      setExplanation(resp);
      updateLoadingState('explanation', false);
    })
  }

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setActiveSection(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {

    const background = localStorage.getItem('learningBackground') || '';

    // Fetch explanation
    updateLoadingState('explanation', true);
    fetchTopicExplanation(
      topic,
      level,
      background,
      "Normal",
      "",
    ).then(resp => {
      setChatContext((c) => ({
        ...c,
        explanation: resp
      }));
      setExplanation(resp);
      updateLoadingState('explanation', false);
    })
    .catch(error => {
      console.error('Error fetching explanation:', error);
      updateLoadingState(
        'explanation',
        false,
        error instanceof Error ? error.message : 'Failed to load explanation'
      );
    });

    // Fetch code examples
    updateLoadingState('code-examples', true);
    getCodeExamples(topic, level, background)
      .then(resp => {
        setCodeExamples(resp);
        setChatContext((chatContext) => ({
          ...chatContext,
          codeExamples: resp
        }));
        updateLoadingState('code-examples', false);
      })
      .catch(error => {
        console.error('Error fetching code examples:', error);
        updateLoadingState(
          'code-examples',
          false,
          error instanceof Error ? error.message : 'Failed to load code examples'
        );
      });

    // Fetch assignments
    updateLoadingState('assignments', true);
    getAssignments(topic, level, background)
      .then(resp => {
        setAssignments(resp);
        setChatContext((chatContext) => ({
          ...chatContext,
          assignments: resp
        }));
        updateLoadingState('assignments', false);
      })
      .catch(error => {
        console.error('Error fetching assignments:', error);
        updateLoadingState(
          'assignments',
          false,
          error instanceof Error ? error.message : 'Failed to load assignments'
        );
      });

    // Fetch related topics
    updateLoadingState('related-topics', true);
    getRelatedTopics(topic, level, background)
      .then(r => {
        setRelatedTopics(r);
        setChatContext((chatContext) => ({
          ...chatContext,
          relatedTopics: r
        }));
        updateLoadingState('related-topics', false);
      })
      .catch(error => {
        console.error('Error fetching related topics:', error);
        updateLoadingState(
          'related-topics',
          false,
          error instanceof Error ? error.message : 'Failed to load related topics'
        );
      });

    // Fetch quiz questions
    // console.log('fetching quiz')
    updateLoadingState('quiz', true);
    getQuiz(topic, level, background)
      .then(q => {
        setQuiz(q);
        setChatContext((chatContext) => ({
          ...chatContext,
          quiz: q
        }))
        updateLoadingState('quiz', false);
      })
      .catch(error => {
        console.error('Error fetching quiz:', error);
        updateLoadingState(
          'quiz',
          false,
          error instanceof Error ? error.message : 'Failed to load quiz'
        );
      });

    updateLoadingState('flashcards', true);
    getFlashCards(topic, level, background)
      .then(c => {
        setFlashCards(c);
        setChatContext((chatContext) => ({
          ...chatContext,
          flashCards: c
        }))
        updateLoadingState('flashcards', false);
      })
      .catch(error => {
        console.error('Error fetching flashcards:', error);
        updateLoadingState(
          'flashcards',
          false,
          error instanceof Error ? error.message : 'Failed to load quiz'
        );
      });
  }, [level, topic]);

  if (!session) {
    return <Login />;
  }

  const StatusIndicator = ({ state }: { state: LoadingState }) => {
    if (state.isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin ml-2" />;
    }
    if (state.error) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertCircle className="h-4 w-4 text-red-500 ml-2" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{state.error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <CheckCircle className="h-4 w-4 text-green-500 ml-2" />;
  };

  const verifyExplanation = async (explanation: string) => {
    const background = localStorage.getItem('learningBackground') || '';

    updateLoadingState('verification', true);
    try {
      const resp = await getVerification(topic, level, background, explanation)
      setVerificationFeedback(resp);
      updateLoadingState('verification', false);
    } catch(error) {
      console.error('Error fetching verification:', error);
      updateLoadingState(
        'verification',
        false,
        error instanceof Error ? error.message : 'Failed to load verification'
      );
    }
  }

  return (
    <div>
      <Navbar showSettings={false} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Learning Dashboard: {topic}</h1>
        <div className="flex">
          <nav className="w-64 pr-8">
            <Chat learn={chatContext} />
            <ul className="space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <Button
                    variant={activeSection === section.id ? 'default' : 'ghost'}
                    className="w-full justify-start relative"
                    onClick={() => {
                      window.history.pushState(null, '', `#${section.id}`);
                      window.dispatchEvent(new HashChangeEvent('hashchange'));
                    }}
                  >
                    <span className="flex-1 text-left">{section.title}</span>
                    <StatusIndicator state={loadingStates[section.id]} />
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
          <main className="flex-1">
            {activeSection === 'explanation' && (
              <TopicExplanation
                explanation={explanation}
                complexity={complexity}
                onComplexityChange={handleExplanationComplexityChange}
              />
            )}
            {activeSection === 'code-examples' && <CodeExamples codeExamples={codeExamples} />}
            {activeSection === 'assignments' && <Assignments assignments={assignments} />}
            {activeSection === 'verification' && <Verification onVerification={verifyExplanation} feedback={verificationFeedback} />}
            {activeSection === 'flashcards' && <Flashcards flashcards={flashCards || []} />}
            {activeSection === 'quiz' && <Quiz questions={quiz || []} />}
            {activeSection === 'related-topics' && <RelatedTopics relatedTopics={relatedTopics} />}
          </main>
        </div>
      </div>
    </div>
  );
}