import { useEffect, useState, useRef } from 'react';
import { useTutorialStore, TutorialStage } from '@/stores/useTutorialStore';
import { useGameStore } from '@/stores/useGameStore';
import { useBeatmapStore } from '@/stores/useBeatmapStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SkipForward } from 'lucide-react';
import Game from '@/pages/Game';

// Progress Counter Component
function ProgressCounter({ currentStage, getRequiredHits }: { 
  currentStage: number; 
  getRequiredHits: (stage: number, total: number) => number;
}) {
  const [progress, setProgress] = useState({ hit: 0, total: 0, required: 0 });
  
  useEffect(() => {
    // Initial check
    const updateProgress = () => {
      const state = useGameStore.getState();
      const totalNotes = state.notes?.length || 0;
      const hitNotes = (state.notes || []).filter(n => n.hit).length;
      const requiredHits = totalNotes > 0 ? getRequiredHits(currentStage, totalNotes) : 0;
      
      setProgress({ hit: hitNotes, total: totalNotes, required: requiredHits });
    };
    
    // Update immediately
    updateProgress();
    
    // Then update every 50ms
    const interval = setInterval(updateProgress, 50);
    
    return () => clearInterval(interval);
  }, [currentStage, getRequiredHits]);
  
  // Always show, even if not initialized yet
  const isOnTrack = progress.total === 0 || progress.hit >= progress.required;
  const progressPercent = progress.total > 0 ? (progress.hit / progress.required) * 100 : 0;
  
  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-3 min-w-[200px]">
      <div className="text-sm font-semibold text-gray-300 mb-2">Stage Progress</div>
      {progress.total === 0 ? (
        <div className="text-sm text-gray-400">Loading notes...</div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${isOnTrack ? 'text-green-400' : 'text-red-400'}`}>
              {progress.hit}
            </span>
            <span className="text-gray-400">/</span>
            <span className="text-lg font-semibold text-gray-300">{progress.required}</span>
            <span className="text-xs text-gray-500">required</span>
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-200 ${isOnTrack ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {progress.total} total notes
          </div>
        </>
      )}
    </div>
  );
}

interface TutorialProps {
  onBack: () => void;
  playerInitializedRef: React.RefObject<boolean>;
}

const STAGE_INFO = {
  1: {
    title: 'Stage 1: Basic TAP Notes',
    objective: 'Learn to hit single notes',
    instructions: 'Press W when the note reaches the judgement line at the center!',
    successCriteria: 'Hit 6/8 notes (75%)',
  },
  2: {
    title: 'Stage 2: All Positions',
    objective: 'Learn all 6 lane positions',
    instructions: 'W=top, O=top-right, I=bottom-right, E=bottom-left, Q=left, P=right',
    successCriteria: 'Hit 6/8 notes (75%)',
  },
  3: {
    title: 'Stage 3: HOLD Notes',
    objective: 'Learn press-and-hold mechanic',
    instructions: 'Press and HOLD Q until the note ends. Release at the right time!',
    successCriteria: 'Complete 3/4 HOLD notes (75%)',
  },
  4: {
    title: 'Stage 4: All Position HOLD Notes',
    objective: 'Practice holding notes on all lanes',
    instructions: 'HOLD notes can appear on any lane. Hold until they end!',
    successCriteria: 'Complete 5/6 HOLD notes (75%)',
  },
  5: {
    title: 'Stage 5: Sync Lines',
    objective: 'Hit multiple notes at the same time',
    instructions: 'Some notes appear together - press multiple keys simultaneously!',
    successCriteria: 'Hit 60% of notes',
  },
  6: {
    title: 'Stage 6: Zoom Effect',
    objective: 'Learn the zoom visual effect',
    instructions: 'HOLD notes on opposite lanes (Q↔P, W↔I, O↔E) trigger zoom!',
    successCriteria: 'Complete 70% of notes',
  },
  7: {
    title: 'Stage 7: Tunnel Spin',
    objective: 'Experience tunnel rotation',
    instructions: 'HOLD notes on diamond positions (W/O/I/E) rotate the tunnel!',
    successCriteria: 'Hit 70% of notes',
  },
  8: {
    title: 'Stage 8: Deck Meters',
    objective: 'Learn about hold progress meters',
    instructions: 'Watch the deck meters fill as you hold notes!',
    successCriteria: 'Complete all 3 HOLD notes',
  },
  9: {
    title: 'Stage 9: Combo System',
    objective: 'Build your combo streak',
    instructions: '10+ combo = red, 20+ combo = green. Don\'t break the combo!',
    successCriteria: 'Reach at least 2 combos of 10+',
  },
  10: {
    title: 'Stage 10: Hit Accuracy',
    objective: 'Perfect your timing',
    instructions: 'Hit notes RIGHT on the judgement line for PERFECT scores!',
    successCriteria: 'Hit 70% of notes',
  },
  11: {
    title: 'Stage 11: Final Test',
    objective: 'Combine everything you learned',
    instructions: 'Show off your skills with all mechanics combined!',
    successCriteria: 'Complete with 60% accuracy',
  },
} as const;

export default function Tutorial({ onBack, playerInitializedRef }: TutorialProps) {
  const { currentStage, completeStage, failStage, skipTutorial, exitTutorial, startTutorial } = useTutorialStore();
  const { gameState } = useGameStore();
  const [showInstructions, setShowInstructions] = useState(true);
  const [stageStarted, setStageStarted] = useState(false);
  const [beatmapLoaded, setBeatmapLoaded] = useState(false);
  const [currentBeatmapText, setCurrentBeatmapText] = useState<string | null>(null);
  const [currentYoutubeVideoId, setCurrentYoutubeVideoId] = useState<string | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const [showFailureOverlay, setShowFailureOverlay] = useState(false);
  const [failureCountdown, setFailureCountdown] = useState(3);
  const [showStageEndOverlay, setShowStageEndOverlay] = useState(false);
  const [stageResults, setStageResults] = useState<{
    passed: boolean;
    hitNotes: number;
    totalNotes: number;
    accuracy: number;
    required: number;
  } | null>(null);
  
  const stageInfo = STAGE_INFO[currentStage as keyof typeof STAGE_INFO];
  
  // Calculate required hits for current stage
  const getRequiredHits = (stage: number, totalNotes: number) => {
    const accuracyMap: { [key: number]: number } = {
      1: 0.75,  // Stage 1: 6/8 notes
      2: 0.75,  // Stage 2: 6/8 notes
      3: 0.75,  // Stage 3: 3/4 hold notes
      4: 0.75,  // Stage 4: 5/6 hold notes
      5: 0.60,  // Stage 5: 60% sync lines
      6: 0.70,  // Stage 6: 70% zoom
      7: 0.70,  // Stage 7: 70% spin
      8: 1.00,  // Stage 8: all 3 hold notes
      9: 0.60,  // Stage 9: combo (special logic)
      10: 0.70, // Stage 10: 70% accuracy
      11: 0.60  // Stage 11: 60% final test
    };
    return Math.ceil(totalNotes * (accuracyMap[stage] || 0.70));
  };

  // Initialize tutorial
  useEffect(() => {
    console.log('[Tutorial] playerInitializedRef.current:', playerInitializedRef.current);
    startTutorial();
    
    // Force destroy the existing YouTube player before loading tutorial beatmap
    import('@/lib/youtube').then(({ destroyYouTubePlayer }) => {
      console.log('[Tutorial] Destroying existing YouTube player before tutorial');
      destroyYouTubePlayer();
    });
  }, [startTutorial]);

  // Initialize YouTube player for tutorial video
  useEffect(() => {
    if (!youtubeContainerRef.current || !currentYoutubeVideoId || !window.YT) return;

    console.log('[Tutorial] Initializing YouTube player for tutorial video:', currentYoutubeVideoId);
    (playerInitializedRef as React.MutableRefObject<boolean>).current = false;
    
    import('@/lib/youtube').then(({ initYouTubePlayer, initYouTubeTimeListener }) => {
      if (!youtubeContainerRef.current) return;
      
      initYouTubePlayer(youtubeContainerRef.current, currentYoutubeVideoId, () => {
        console.log('[Tutorial] YouTube player ready for tutorial');
        (playerInitializedRef as React.MutableRefObject<boolean>).current = true;
      });
      initYouTubeTimeListener();
    });

    return () => {
      console.log('[Tutorial] Cleaning up tutorial YouTube player');
      import('@/lib/youtube').then(({ destroyYouTubePlayer }) => {
        destroyYouTubePlayer();
      });
    };
  }, [currentYoutubeVideoId, playerInitializedRef]);

  // Load beatmap for current stage
  useEffect(() => {
    loadTutorialStage(currentStage);
  }, [currentStage]);

  const loadTutorialStage = async (stage: TutorialStage) => {
    try {
      const response = await fetch(`/beatmaps/tutorial-stage-${stage}.txt`);
      if (!response.ok) throw new Error('Failed to load tutorial beatmap');
      
      const beatmapText = await response.text();
      console.log('[Tutorial] Loaded beatmap for stage', stage, 'length:', beatmapText.length);
      console.log('[Tutorial] Beatmap text preview:', beatmapText.substring(0, 200));
      
      // Extract YouTube video ID from beatmap text
      const youtubeMatch = beatmapText.match(/youtube:\s*(\S+)/i);
      const youtubeVideoId = youtubeMatch ? youtubeMatch[1] : null;
      console.log('[Tutorial] Extracted YouTube ID:', youtubeVideoId);
      
      // Store in local state - DO NOT touch localStorage store
      setCurrentBeatmapText(beatmapText);
      setCurrentYoutubeVideoId(youtubeVideoId);
      
      console.log('[Tutorial] Stored beatmap locally - youtubeVideoId:', youtubeVideoId);
      console.log('[Tutorial] Stored beatmap locally - beatmapText length:', beatmapText.length);
      
      setBeatmapLoaded(true);
    } catch (error) {
      console.error('[Tutorial] Failed to load stage beatmap:', error);
    }
  };

  // Monitor notes in real-time for fail detection
  useEffect(() => {
    if (!stageStarted || gameState !== 'PLAYING' || showFailureOverlay) return;
    
    // Check every 100ms
    const interval = setInterval(() => {
      if (!stageStarted || gameState !== 'PLAYING' || showFailureOverlay) return;
      
      const { notes } = useGameStore.getState();
      const totalNotes = notes.length;
      if (totalNotes === 0) return; // Wait for notes to load
      
      const hitNotes = notes.filter(n => n.hit).length;
      const missedNotes = notes.filter(n => 
        n.missed || n.tapMissFailure || n.holdMissFailure || 
        n.tapTooEarlyFailure || n.tooEarlyFailure || n.holdReleaseFailure
      ).length;
      
      const requiredHits = getRequiredHits(currentStage, totalNotes);
      const remainingNotes = totalNotes - hitNotes - missedNotes;
      const maxPossibleHits = hitNotes + remainingNotes;
      
      if (maxPossibleHits < requiredHits) {
        console.log('[Tutorial] Fail detected - showing overlay');
        failStage();
        
        // Pause the game
        useGameStore.getState().setGameState('PAUSED');
        
        // Show failure overlay
        setShowFailureOverlay(true);
        setFailureCountdown(3);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [stageStarted, gameState, currentStage, failStage, showFailureOverlay]);
  
  // Handle failure countdown
  useEffect(() => {
    if (!showFailureOverlay) return;
    
    if (failureCountdown > 0) {
      const timer = setTimeout(() => {
        setFailureCountdown(failureCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished - rewind and restart
      setShowFailureOverlay(false);
      
      import('@/lib/youtube').then(({ seekYouTubeVideo }) => {
        seekYouTubeVideo(0);
      });
      
      setTimeout(() => {
        useGameStore.getState().restartGame();
      }, 100);
    }
  }, [showFailureOverlay, failureCountdown]);
  
  // Check for stage completion when all notes are processed
  useEffect(() => {
    if (!stageStarted || showFailureOverlay || showStageEndOverlay) return;
    
    // Check if all notes have been processed (hit or missed)
    const checkCompletion = () => {
      const { notes, health, maxHealth, combo, gameState } = useGameStore.getState();
      const totalNotes = notes.length;
      
      if (totalNotes === 0) return false; // No notes loaded yet
      
      const processedNotes = notes.filter(n => 
        n.hit || n.missed || n.tapMissFailure || n.holdMissFailure || 
        n.tapTooEarlyFailure || n.tooEarlyFailure || n.holdReleaseFailure
      ).length;
      
      // All notes have been processed
      if (processedNotes === totalNotes && gameState === 'PLAYING') {
        const hitNotes = notes.filter(n => n.hit).length;
        const accuracy = hitNotes / totalNotes;
        const requiredHits = getRequiredHits(currentStage, totalNotes);
        
        console.log('[Tutorial] All notes processed - hit:', hitNotes, 'total:', totalNotes, 'accuracy:', accuracy);

        // Stage-specific success criteria
        let stageSuccess = false;
        
        switch (currentStage) {
          case 1:
            stageSuccess = accuracy >= 0.75; // 6/8 notes
            break;
          case 2:
            stageSuccess = accuracy >= 0.75; // 6/8 notes
            break;
          case 3:
            stageSuccess = accuracy >= 0.75; // 3/4 hold notes
            break;
          case 4:
            stageSuccess = accuracy >= 0.75; // 5/6 hold notes
            break;
          case 5:
            stageSuccess = accuracy >= 0.60; // 60% sync lines
            break;
          case 6:
            stageSuccess = accuracy >= 0.70; // 70% zoom
            break;
          case 7:
            stageSuccess = accuracy >= 0.70; // 70% spin
            break;
          case 8:
            stageSuccess = accuracy >= 1.00; // All 3 hold notes
            break;
          case 9:
            // Combo stage: need at least 2 combos of 10+
            // For now, just check accuracy until combo tracking is added
            stageSuccess = accuracy >= 0.60;
            break;
          case 10:
            stageSuccess = accuracy >= 0.70; // 70% accuracy
            break;
          case 11:
            stageSuccess = accuracy >= 0.60; // 60% final test
            break;
          default:
            stageSuccess = accuracy >= 0.70;
        }

        // Pause the game and show results
        useGameStore.getState().setGameState('PAUSED');
        
        if (stageSuccess) {
          // Only show overlay for success
          setStageResults({
            passed: true,
            hitNotes,
            totalNotes,
            accuracy,
            required: requiredHits
          });
          setShowStageEndOverlay(true);
        } else {
          // Failed - auto restart without overlay
          console.log('[Tutorial] Stage failed - restarting');
          failStage();
          
          import('@/lib/youtube').then(({ seekYouTubeVideo }) => {
            seekYouTubeVideo(0);
          });
          
          setTimeout(() => {
            useGameStore.getState().restartGame();
          }, 500);
        }
        
        return true;
      }
      
      return false;
    };
    
    // Poll during gameplay to catch completion
    const interval = setInterval(() => {
      if (checkCompletion()) {
        clearInterval(interval);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [stageStarted, currentStage, showFailureOverlay, showStageEndOverlay]);

  const handleSkip = () => {
    if (confirm('Skip tutorial? You can always replay it from Settings.')) {
      setCurrentYoutubeVideoId(null);
      setCurrentBeatmapText(null);
      skipTutorial();
      
      // Force re-initialization of main localStorage player
      const storedVideoId = useBeatmapStore.getState().youtubeVideoId;
      if (storedVideoId) {
        useBeatmapStore.getState().setYoutubeVideoId(null);
        setTimeout(() => {
          useBeatmapStore.getState().setYoutubeVideoId(storedVideoId);
          onBack();
        }, 50);
      } else {
        onBack();
      }
    }
  };
  
  const handleSkipStage = () => {
    if (currentStage === 11) {
      // Last stage, complete tutorial
      setCurrentYoutubeVideoId(null);
      setCurrentBeatmapText(null);
      skipTutorial();
      
      // Force re-initialization of main localStorage player
      const storedVideoId = useBeatmapStore.getState().youtubeVideoId;
      if (storedVideoId) {
        useBeatmapStore.getState().setYoutubeVideoId(null);
        setTimeout(() => {
          useBeatmapStore.getState().setYoutubeVideoId(storedVideoId);
          onBack();
        }, 50);
      } else {
        onBack();
      }
    } else {
      // Move to next stage
      completeStage(currentStage);
      setShowInstructions(true);
      setStageStarted(false);
    }
  };
  
  const handleNextStage = () => {
    setShowStageEndOverlay(false);
    setStageResults(null);
    
    // Stage was passed (we only show overlay on success now)
    completeStage(currentStage);
    if (currentStage === 11) {
      // Tutorial complete!
      setCurrentYoutubeVideoId(null);
      setCurrentBeatmapText(null);
      alert('🎉 Congratulations! You completed the tutorial!');
      
      // Force re-initialization of main localStorage player
      const storedVideoId = useBeatmapStore.getState().youtubeVideoId;
      if (storedVideoId) {
        useBeatmapStore.getState().setYoutubeVideoId(null);
        setTimeout(() => {
          useBeatmapStore.getState().setYoutubeVideoId(storedVideoId);
          onBack();
        }, 50);
      } else {
        onBack();
      }
    } else {
      // Move to next stage
      setShowInstructions(true);
      setStageStarted(false);
    }
  };

  const handleExit = () => {
    setCurrentYoutubeVideoId(null);
    setCurrentBeatmapText(null);
    exitTutorial();
    
    // Force re-initialization of main localStorage player
    const storedVideoId = useBeatmapStore.getState().youtubeVideoId;
    if (storedVideoId) {
      // Trigger App's useEffect by briefly changing the videoId
      useBeatmapStore.getState().setYoutubeVideoId(null);
      setTimeout(() => {
        useBeatmapStore.getState().setYoutubeVideoId(storedVideoId);
        onBack();
      }, 50);
    } else {
      onBack();
    }
  };

  return (
    <div className="fixed inset-0 text-white">
      {/* YouTube player container - hidden but active */}
      {currentYoutubeVideoId && (
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          ref={youtubeContainerRef}
          style={{ display: 'block', opacity: 0, width: '100%', height: '100%' }}
        />
      )}

      {/* Header - Only show during instructions */}
      {showInstructions && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExit}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Exit Tutorial
            </Button>
            
            <div className="text-center">
              <h1 className="text-xl font-bold">{stageInfo.title}</h1>
              <p className="text-sm text-gray-400">Stage {currentStage} of 11</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipStage}
                className="gap-2"
              >
                <SkipForward className="w-4 h-4" />
                Skip Stage
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="gap-2"
              >
                <SkipForward className="w-4 h-4" />
                Skip Tutorial
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Overlay */}
      {showInstructions && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="max-w-2xl mx-4 p-8 bg-gray-800 rounded-lg border border-gray-700 space-y-6">
            <h2 className="text-3xl font-bold text-center">{stageInfo.title}</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-cyan-400">Objective:</h3>
                <p className="text-gray-300">{stageInfo.objective}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Instructions:</h3>
                <p className="text-gray-300">{stageInfo.instructions}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-400">Success Criteria:</h3>
                <p className="text-gray-300">{stageInfo.successCriteria}</p>
              </div>
            </div>

            <Button
              onClick={() => {
                console.log('[Tutorial] Starting stage', currentStage);
                console.log('[Tutorial] Beatmap loaded:', beatmapLoaded);
                console.log('[Tutorial] YouTube video ID:', currentYoutubeVideoId);
                setShowInstructions(false);
                setStageStarted(true);
                console.log('[Tutorial] State updated - showInstructions: false, stageStarted: true');
                
                // Log game state after a short delay to see what happens
                setTimeout(() => {
                  const gameState = useGameStore.getState().gameState;
                  const currentTime = useGameStore.getState().currentTime;
                  console.log('[Tutorial] Game state after start:', gameState);
                  console.log('[Tutorial] Current time after start:', currentTime);
                }, 1000);
              }}
              className="w-full py-6 text-lg"
            >
              Start Stage {currentStage}
            </Button>
          </div>
        </div>
      )}

      {/* Game Component */}
      {!showInstructions && stageStarted && beatmapLoaded && (
        <>
          <Game
            key={`tutorial-${currentStage}`}
            difficulty="EASY"
            onBackToHome={() => {
              setShowInstructions(true);
              setStageStarted(false);
            }}
            playerInitializedRef={playerInitializedRef}
            youtubeVideoId={currentYoutubeVideoId}
            beatmapText={currentBeatmapText}
          />
          
          {/* Progress Counter Overlay */}
          <ProgressCounter 
            currentStage={currentStage} 
            getRequiredHits={getRequiredHits}
          />
          
          {/* Failure Overlay */}
          {showFailureOverlay && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="text-center space-y-6">
                <div className="text-6xl font-bold text-red-500 animate-pulse">
                  FAILED!
                </div>
                <div className="text-2xl text-white">
                  You can't reach the required score
                </div>
                <div className="text-4xl font-bold text-white">
                  Restarting in {failureCountdown}...
                </div>
              </div>
            </div>
          )}
          
          {/* Stage End Overlay - Only shown on success */}
          {showStageEndOverlay && stageResults && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-gray-800 rounded-lg border-2 border-green-500 p-8 max-w-md w-full mx-4 space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-4 text-green-500">
                    STAGE COMPLETE!
                  </div>
                  <div className="text-2xl text-white mb-2">
                    Stage {currentStage} of 11
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-300">Notes Hit:</span>
                    <span className="text-white font-bold">{stageResults.hitNotes} / {stageResults.totalNotes}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-300">Accuracy:</span>
                    <span className="font-bold text-green-400">
                      {(stageResults.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-300">Required:</span>
                    <span className="text-white font-bold">{stageResults.required} notes</span>
                  </div>
                </div>
                
                <Button
                  onClick={handleNextStage}
                  className="w-full py-6 text-xl"
                >
                  {currentStage === 11 ? 'Complete Tutorial' : 'Next Stage'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
