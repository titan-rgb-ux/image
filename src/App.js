import { useState, useEffect, useCallback } from "react";
import "./App.css";

// Card definitions
const COLORS = ["red", "blue", "green", "yellow"];
const SPECIAL_CARDS = ["skip", "reverse", "draw2", "wild", "wild4"];
const NUMBERS = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9];

// Generate a full UNO deck
const createDeck = () => {
  const deck = [];
  
  COLORS.forEach(color => {
    NUMBERS.forEach(number => {
      deck.push({ 
        id: `${color}-${number}-${Math.random()}`, 
        color, 
        value: number.toString(), 
        type: "number" 
      });
    });
  });
  
  COLORS.forEach(color => {
    SPECIAL_CARDS.slice(0, 3).forEach(type => {
      deck.push({ id: `${color}-${type}-1-${Math.random()}`, color, value: type, type });
      deck.push({ id: `${color}-${type}-2-${Math.random()}`, color, value: type, type });
    });
  });
  
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild-${i}-${Math.random()}`, color: "black", value: "wild", type: "wild" });
    deck.push({ id: `wild4-${i}-${Math.random()}`, color: "black", value: "wild4", type: "wild4" });
  }
  
  return deck.sort(() => Math.random() - 0.5);
};

// AI player logic
const aiPlayCard = (hand, topCard, currentColor) => {
  const validCards = hand.filter(card => 
    card.color === currentColor || 
    card.color === "black" || 
    (topCard && (card.value === topCard.value || card.color === topCard.color))
  );
  
  const specialCards = validCards.filter(card => card.type !== "number");
  
  if (specialCards.length > 0) {
    return specialCards[0];
  }
  
  return validCards.length > 0 ? validCards[0] : null;
};

function App() {
  // Setup state
  const [gameMode, setGameMode] = useState(null); // null, 'setup', 'playing'
  const [numPlayers, setNumPlayers] = useState(4);
  const [playerNames, setPlayerNames] = useState([]);
  const [playerTypes, setPlayerTypes] = useState([]); // 'human' or 'ai'
  
  // Game state
  const [deck, setDeck] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameDirection, setGameDirection] = useState(1);
  const [currentColor, setCurrentColor] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [message, setMessage] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [animateCard, setAnimateCard] = useState(null);
  const [unoWarning, setUnoWarning] = useState(null);
  const [lastPlayedCard, setLastPlayedCard] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [challengeActive, setChallengeActive] = useState(false);
  
  // Initialize game setup
  const initializeSetup = (mode) => {
    setGameMode('setup');
    if (mode === 'ai') {
      setNumPlayers(4);
      setPlayerNames(["You", "AI Bot 1", "AI Bot 2", "AI Bot 3"]);
      setPlayerTypes(["human", "ai", "ai", "ai"]);
    } else {
      setNumPlayers(2);
      setPlayerNames(["Player 1", "Player 2"]);
      setPlayerTypes(["human", "human"]);
    }
  };
  
  // Update player setup
  const updatePlayerName = (index, name) => {
    const newNames = [...playerNames];
    newNames[index] = name || `Player ${index + 1}`;
    setPlayerNames(newNames);
  };
  
  const updatePlayerType = (index, type) => {
    const newTypes = [...playerTypes];
    newTypes[index] = type;
    setPlayerTypes(newTypes);
  };
  
  const addPlayer = () => {
    if (numPlayers < 6) {
      const newNum = numPlayers + 1;
      setNumPlayers(newNum);
      setPlayerNames([...playerNames, `Player ${newNum}`]);
      setPlayerTypes([...playerTypes, "human"]);
    }
  };
  
  const removePlayer = () => {
    if (numPlayers > 2) {
      setNumPlayers(numPlayers - 1);
      setPlayerNames(playerNames.slice(0, -1));
      setPlayerTypes(playerTypes.slice(0, -1));
    }
  };
  
  // Start game
  const startGame = useCallback(() => {
    const newDeck = createDeck();
    let initialDiscard = [newDeck.pop()];
    
    // Ensure first card is not an action card
    while (initialDiscard[0].type !== "number") {
      newDeck.push(initialDiscard[0]);
      initialDiscard = [newDeck.pop()];
    }
    
    const newPlayers = playerNames.map((name, index) => ({
      id: `player-${index}`,
      name: name,
      isHuman: playerTypes[index] === "human",
      hand: [],
      unoCalled: false,
      score: 0
    }));
    
    newPlayers.forEach(player => {
      for (let i = 0; i < 7; i++) {
        player.hand.push(newDeck.pop());
      }
    });
    
    setDeck(newDeck);
    setDiscardPile(initialDiscard);
    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setGameDirection(1);
    setCurrentColor(initialDiscard[0].color);
    setGameStarted(true);
    setGameOver(false);
    setWinner(null);
    setSelectedCard(null);
    setShowColorPicker(false);
    setMessage(`${newPlayers[0].name}'s turn!`);
    setGameMode('playing');
    
    if (!newPlayers[0].isHuman) {
      setTimeout(() => playAiTurn(newPlayers, 0), 1500);
    }
  }, [playerNames, playerTypes]);
  
  // Handle card click
  const handleCardClick = (card) => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer.isHuman || gameOver) return;
    
    const topCard = discardPile[discardPile.length - 1];
    
    const isPlayable = 
      card.color === currentColor || 
      card.color === "black" || 
      card.value === topCard.value;
    
    if (!isPlayable) {
      setMessage("❌ Invalid move! Card must match color or value.");
      setTimeout(() => setMessage(`${currentPlayer.name}'s turn`), 2000);
      return;
    }
    
    setSelectedCard(card);
    
    if (card.color === "black") {
      setShowColorPicker(true);
      setMessage("Choose a color");
    } else {
      playCard(card, players, currentPlayerIndex);
    }
  };
  
  // Play a card
  const playCard = (card, playersState = players, playerIndex = currentPlayerIndex, chosenColor = null) => {
    const currentPlayer = playersState[playerIndex];
    
    const newHand = currentPlayer.hand.filter(c => c.id !== card.id);
    const newPlayers = [...playersState];
    newPlayers[playerIndex] = { ...currentPlayer, hand: newHand };
    
    const newDiscardPile = [...discardPile, card];
    setLastPlayedCard(card);
    
    setAnimateCard(card);
    setTimeout(() => setAnimateCard(null), 600);
    
    let nextPlayerIndex = playerIndex;
    let newDirection = gameDirection;
    let cardsToDraw = 0;
    let skipNext = false;
    
    switch (card.value) {
      case "skip":
        skipNext = true;
        nextPlayerIndex = (playerIndex + gameDirection + playersState.length) % playersState.length;
        setMessage(`🚫 ${currentPlayer.name} played Skip! ${playersState[nextPlayerIndex].name} loses a turn.`);
        break;
        
      case "reverse":
        newDirection = -gameDirection;
        setGameDirection(newDirection);
        if (playersState.length === 2) {
          skipNext = true;
          nextPlayerIndex = (playerIndex + gameDirection + playersState.length) % playersState.length;
          setMessage(`🔄 ${currentPlayer.name} played Reverse! (acts as Skip)`);
        } else {
          setMessage(`🔄 ${currentPlayer.name} played Reverse! Direction changed.`);
        }
        break;
        
      case "draw2":
        cardsToDraw = 2;
        nextPlayerIndex = (playerIndex + gameDirection + playersState.length) % playersState.length;
        setMessage(`+2 ${currentPlayer.name} played Draw Two! ${playersState[nextPlayerIndex].name} draws 2 cards.`);
        break;
        
      case "wild4":
        cardsToDraw = 4;
        nextPlayerIndex = (playerIndex + gameDirection + playersState.length) % playersState.length;
        setMessage(`+4 ${currentPlayer.name} played Wild Draw Four! ${playersState[nextPlayerIndex].name} draws 4 cards.`);
        break;
        
      case "wild":
        setMessage(`🌈 ${currentPlayer.name} played Wild! Chose ${chosenColor || currentColor}.`);
        break;
        
      default:
        setMessage(`${currentPlayer.name} played ${card.color} ${card.value}`);
    }
    
    let newCurrentColor = currentColor;
    if (card.color === "black") {
      newCurrentColor = chosenColor || currentColor;
    } else {
      newCurrentColor = card.color;
    }
    
    // Check for UNO violation
    if (newHand.length === 1 && !currentPlayer.unoCalled) {
      setUnoWarning(currentPlayer.name);
      setTimeout(() => setUnoWarning(null), 3000);
      for (let i = 0; i < 2; i++) {
        if (deck.length > 0) {
          newHand.push(deck.pop());
        }
      }
      setMessage(`⚠️ ${currentPlayer.name} forgot to say UNO! Drew 2 penalty cards.`);
    }
    
    // Check for win
    if (newHand.length === 0) {
      setGameOver(true);
      setWinner(currentPlayer);
      setMessage(`🎉 ${currentPlayer.name} wins the game!`);
    }
    
    setPlayers(newPlayers);
    setDiscardPile(newDiscardPile);
    setCurrentColor(newCurrentColor);
    
    // Handle card drawing
    if (cardsToDraw > 0 && !gameOver) {
      setTimeout(() => {
        const nextPlayer = newPlayers[nextPlayerIndex];
        const newNextHand = [...nextPlayer.hand];
        
        for (let i = 0; i < cardsToDraw; i++) {
          if (deck.length > 0) {
            newNextHand.push(deck.pop());
          }
        }
        
        newPlayers[nextPlayerIndex] = { ...nextPlayer, hand: newNextHand };
        setPlayers([...newPlayers]);
        
        const finalNextIndex = (nextPlayerIndex + newDirection + playersState.length) % playersState.length;
        setCurrentPlayerIndex(finalNextIndex);
        
        if (!newPlayers[finalNextIndex].isHuman && !gameOver) {
          setTimeout(() => playAiTurn(newPlayers, finalNextIndex), 1500);
        }
      }, 1000);
    } else {
      nextPlayerIndex = (playerIndex + gameDirection + playersState.length) % playersState.length;
      
      if (skipNext) {
        nextPlayerIndex = (nextPlayerIndex + newDirection + playersState.length) % playersState.length;
      }
      
      setCurrentPlayerIndex(nextPlayerIndex);
      
      if (!newPlayers[nextPlayerIndex].isHuman && !gameOver) {
        setTimeout(() => playAiTurn(newPlayers, nextPlayerIndex), 1500);
      } else if (newPlayers[nextPlayerIndex].isHuman) {
        setMessage(`${newPlayers[nextPlayerIndex].name}'s turn`);
      }
    }
    
    setSelectedCard(null);
    setShowColorPicker(false);
    
    // Reset UNO call after playing
    if (currentPlayer.unoCalled && newHand.length !== 1) {
      newPlayers[playerIndex].unoCalled = false;
      setPlayers([...newPlayers]);
    }
  };
  
  // AI turn
  const playAiTurn = (playersState = players, playerIndex = currentPlayerIndex) => {
    if (gameOver) return;
    
    const currentPlayer = playersState[playerIndex];
    if (currentPlayer.isHuman) return;
    
    setMessage(`🤖 ${currentPlayer.name} is thinking...`);
    
    setTimeout(() => {
      const topCard = discardPile[discardPile.length - 1];
      const cardToPlay = aiPlayCard(currentPlayer.hand, topCard, currentColor);
      
      if (cardToPlay) {
        // Auto UNO call
        if (currentPlayer.hand.length === 2) {
          const updatedPlayers = playersState.map(p => 
            p.id === currentPlayer.id ? { ...p, unoCalled: true } : p
          );
          setPlayers(updatedPlayers);
          setMessage(`🎯 ${currentPlayer.name} says UNO!`);
          setTimeout(() => {
            if (cardToPlay.color === "black") {
              const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
              currentPlayer.hand.forEach(card => {
                if (card.color !== "black") colorCounts[card.color]++;
              });
              
              let chosenColor = "red";
              let maxCount = 0;
              Object.entries(colorCounts).forEach(([color, count]) => {
                if (count > maxCount) {
                  maxCount = count;
                  chosenColor = color;
                }
              });
              
              playCard(cardToPlay, updatedPlayers, playerIndex, chosenColor);
            } else {
              playCard(cardToPlay, updatedPlayers, playerIndex);
            }
          }, 1000);
        } else {
          if (cardToPlay.color === "black") {
            const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
            currentPlayer.hand.forEach(card => {
              if (card.color !== "black") colorCounts[card.color]++;
            });
            
            let chosenColor = "red";
            let maxCount = 0;
            Object.entries(colorCounts).forEach(([color, count]) => {
              if (count > maxCount) {
                maxCount = count;
                chosenColor = color;
              }
            });
            
            playCard(cardToPlay, playersState, playerIndex, chosenColor);
          } else {
            playCard(cardToPlay, playersState, playerIndex);
          }
        }
      } else {
        drawCard(playersState, playerIndex);
      }
    }, 1000);
  };
  
  // Draw card
  const drawCard = (playersState = players, playerIndex = currentPlayerIndex) => {
    if (isDrawing || gameOver) return;
    
    setIsDrawing(true);
    const currentPlayer = playersState[playerIndex];
    
    if (deck.length === 0) {
      const topCard = discardPile[discardPile.length - 1];
      const reshuffledDeck = discardPile.slice(0, -1).sort(() => Math.random() - 0.5);
      setDeck(reshuffledDeck);
      setDiscardPile([topCard]);
      setMessage("🔄 Deck reshuffled!");
      
      setTimeout(() => setIsDrawing(false), 1000);
      return;
    }
    
    const drawnCard = deck[deck.length - 1];
    const newHand = [...currentPlayer.hand, drawnCard];
    const newPlayers = [...playersState];
    newPlayers[playerIndex] = { ...currentPlayer, hand: newHand };
    
    setPlayers(newPlayers);
    setDeck(deck.slice(0, -1));
    
    const topCard = discardPile[discardPile.length - 1];
    const isPlayable = 
      drawnCard.color === currentColor || 
      drawnCard.color === "black" || 
      drawnCard.value === topCard.value;
    
    if (currentPlayer.isHuman) {
      if (isPlayable) {
        setMessage(`📥 You drew a ${drawnCard.color} ${drawnCard.value}. You can play it!`);
      } else {
        setMessage(`📥 You drew a card. Cannot play it.`);
        setTimeout(() => {
          const nextPlayerIndex = (playerIndex + gameDirection + playersState.length) % playersState.length;
          setCurrentPlayerIndex(nextPlayerIndex);
          
          if (!newPlayers[nextPlayerIndex].isHuman && !gameOver) {
            setTimeout(() => playAiTurn(newPlayers, nextPlayerIndex), 1500);
          } else {
            setMessage(`${newPlayers[nextPlayerIndex].name}'s turn`);
          }
        }, 2000);
      }
    } else {
      setMessage(`${currentPlayer.name} drew a card.`);
      setTimeout(() => {
        const nextPlayerIndex = (playerIndex + gameDirection + playersState.length) % playersState.length;
        setCurrentPlayerIndex(nextPlayerIndex);
        
        if (!newPlayers[nextPlayerIndex].isHuman && !gameOver) {
          setTimeout(() => playAiTurn(newPlayers, nextPlayerIndex), 1500);
        } else {
          setMessage(`${newPlayers[nextPlayerIndex].name}'s turn`);
        }
      }, 1000);
    }
    
    setIsDrawing(false);
  };
  
  // Call UNO
  const callUno = () => {
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.hand.length === 2 && !currentPlayer.unoCalled) {
      const newPlayers = players.map(p => 
        p.id === currentPlayer.id ? { ...p, unoCalled: true } : p
      );
      setPlayers(newPlayers);
      setMessage("🎯 UNO! You've called UNO!");
    }
  };
  
  // Color selection
  const handleColorSelect = (color) => {
    if (selectedCard) {
      playCard(selectedCard, players, currentPlayerIndex, color);
    }
  };
  
  // Reset game
  const resetGame = () => {
    setGameMode(null);
    setGameStarted(false);
    setGameOver(false);
    setPlayers([]);
    setDeck([]);
    setDiscardPile([]);
  };
  
  // Card component
  const Card = ({ card, isPlayable = false, onClick, isSmall = false, isAnimating = false }) => {
    const getCardValueDisplay = () => {
      if (card.value === "wild") return "W";
      if (card.value === "wild4") return "+4";
      if (card.value === "skip") return "⊘";
      if (card.value === "reverse") return "⇄";
      if (card.value === "draw2") return "+2";
      return card.value;
    };
    
    return (
      <div 
        className={`card ${card.color} ${isSmall ? 'small' : ''} ${
          isPlayable ? "playable" : ""
        } ${isAnimating ? "animating" : ""}`}
        onClick={onClick}
      >
        <div className="card-inner">
          <div className="card-corner top-left">{getCardValueDisplay()}</div>
          <div className="card-center">
            {card.color === "black" ? (
              <div className="wild-indicator">
                <div className="wild-gradient"></div>
                <span className="wild-label">{card.value === "wild" ? "WILD" : "+4"}</span>
              </div>
            ) : (
              <span className="card-main-value">{getCardValueDisplay()}</span>
            )}
          </div>
          <div className="card-corner bottom-right">{getCardValueDisplay()}</div>
        </div>
      </div>
    );
  };
  
  // Menu screen
  if (!gameMode) {
    return (
      <div className="uno-container menu-screen">
        <div className="game-title">
          <div className="uno-logo">UNO</div>
          <p className="tagline">The Classic Card Game</p>
        </div>
        
        <div className="menu-options">
          <button onClick={() => initializeSetup('friends')} className="menu-btn primary">
            <span className="btn-icon">👥</span>
            <div className="btn-content">
              <span className="btn-title">Play with Friends</span>
              <span className="btn-subtitle">2-6 Players • Local Multiplayer</span>
            </div>
          </button>
          
          <button onClick={() => initializeSetup('ai')} className="menu-btn secondary">
            <span className="btn-icon">🤖</span>
            <div className="btn-content">
              <span className="btn-title">Play vs AI</span>
              <span className="btn-subtitle">You vs 3 AI Opponents</span>
            </div>
          </button>
          
          <button onClick={() => setShowRules(true)} className="menu-btn tertiary">
            <span className="btn-icon">📖</span>
            <div className="btn-content">
              <span className="btn-title">How to Play</span>
              <span className="btn-subtitle">Learn the rules</span>
            </div>
          </button>
        </div>
        
        {showRules && (
          <div className="modal-overlay" onClick={() => setShowRules(false)}>
            <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
              <h2>How to Play UNO</h2>
              <div className="rules-content">
                <div className="rule-section">
                  <h3>🎯 Objective</h3>
                  <p>Be the first player to get rid of all your cards!</p>
                </div>
                
                <div className="rule-section">
                  <h3>🎮 Gameplay</h3>
                  <ul>
                    <li>Match the top card by color or number</li>
                    <li>Play action cards to disrupt opponents</li>
                    <li>Use Wild cards to change the color</li>
                    <li>Draw a card if you can't play</li>
                  </ul>
                </div>
                
                <div className="rule-section">
                  <h3>🃏 Special Cards</h3>
                  <ul>
                    <li><strong>Skip (⊘):</strong> Next player loses their turn</li>
                    <li><strong>Reverse (⇄):</strong> Change direction of play</li>
                    <li><strong>Draw Two (+2):</strong> Next player draws 2 cards</li>
                    <li><strong>Wild (W):</strong> Change the color</li>
                    <li><strong>Wild Draw Four (+4):</strong> Change color & next player draws 4</li>
                  </ul>
                </div>
                
                <div className="rule-section">
                  <h3>⚠️ UNO Rule</h3>
                  <p>When you have only ONE card left, you must call "UNO"! If you forget, you'll draw 2 penalty cards.</p>
                </div>
              </div>
              <button onClick={() => setShowRules(false)} className="close-btn">Got it!</button>
            </div>
          </div>
        )}
        
        <footer className="game-footer">
          <p>UNO™ is a trademark of Mattel. Fan-made version for educational purposes.</p>
        </footer>
      </div>
    );
  }
  
  // Setup screen
  if (gameMode === 'setup') {
    return (
      <div className="uno-container setup-screen">
        <div className="setup-header">
          <button onClick={() => setGameMode(null)} className="back-btn">← Back</button>
          <h1>Game Setup</h1>
        </div>
        
        <div className="setup-content">
          <div className="player-count-selector">
            <h2>Number of Players</h2>
            <div className="count-controls">
              <button onClick={removePlayer} disabled={numPlayers <= 2} className="count-btn">-</button>
              <span className="count-display">{numPlayers}</span>
              <button onClick={addPlayer} disabled={numPlayers >= 6} className="count-btn">+</button>
            </div>
          </div>
          
          <div className="players-setup">
            <h2>Player Details</h2>
            {playerNames.map((name, index) => (
              <div key={index} className="player-setup-row">
                <span className="player-number">P{index + 1}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updatePlayerName(index, e.target.value)}
                  placeholder={`Player ${index + 1}`}
                  className="player-name-input"
                  maxLength={15}
                />
                <select
                  value={playerTypes[index]}
                  onChange={(e) => updatePlayerType(index, e.target.value)}
                  className="player-type-select"
                >
                  <option value="human">👤 Human</option>
                  <option value="ai">🤖 AI</option>
                </select>
              </div>
            ))}
          </div>
          
          <button onClick={startGame} className="start-game-btn">
            Start Game 🎮
          </button>
        </div>
      </div>
    );
  }
  
  // Game screen
  if (!gameStarted) return null;
  
  const currentPlayer = players[currentPlayerIndex];
  const topCard = discardPile[discardPile.length - 1];
  const humanPlayers = players.filter(p => p.isHuman);
  const mainPlayer = players[0];
  
  return (
    <div className="uno-container game-screen">
      <div className="game-header">
        <div className="header-left">
          <div className="uno-logo-small">UNO</div>
          <div className="current-color-box" style={{ backgroundColor: `var(--${currentColor})` }}>
            <span className="color-name">{currentColor}</span>
          </div>
        </div>
        
        <div className="game-message-box">
          <span className="message-text">{message}</span>
        </div>
        
        <div className="header-right">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="icon-btn">
            {soundEnabled ? "🔊" : "🔇"}
          </button>
          <button onClick={resetGame} className="icon-btn">⚙️</button>
        </div>
      </div>
      
      {/* Other players */}
      <div className="other-players-container">
        {players.map((player, index) => {
          if (index === 0 && player.isHuman) return null;
          
          const position = index === 0 ? 'opponent-1' : 
                         index === 1 ? 'opponent-2' : 
                         index === 2 ? 'opponent-3' :
                         index === 3 ? 'opponent-4' :
                         index === 4 ? 'opponent-5' : 'opponent-6';
          
          return (
            <div key={player.id} className={`opponent-player ${position} ${currentPlayerIndex === index ? 'active' : ''}`}>
              <div className="opponent-info">
                <span className="opponent-name">
                  {player.name}
                  {player.unoCalled && <span className="uno-badge-small">UNO!</span>}
                </span>
                <span className="opponent-card-count">{player.hand.length} 🃏</span>
              </div>
              <div className="opponent-cards">
                {player.hand.slice(0, 5).map((_, i) => (
                  <div key={i} className="opponent-card" style={{ left: `${i * 12}px` }}></div>
                ))}
                {player.hand.length > 5 && <span className="more-cards">+{player.hand.length - 5}</span>}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Game center */}
      <div className="game-center-area">
        <div className="deck-area">
          <div className="draw-pile-container" onClick={() => currentPlayer.isHuman && !gameOver && drawCard()}>
            {deck.length > 0 ? (
              <>
                <div className="card-stack">
                  <div className="card-back"></div>
                  <div className="card-back" style={{ transform: 'translate(2px, 2px)' }}></div>
                  <div className="card-back" style={{ transform: 'translate(4px, 4px)' }}></div>
                </div>
                <div className="pile-label">
                  <span className="pile-count">{deck.length}</span>
                  <span className="pile-text">DRAW</span>
                </div>
              </>
            ) : (
              <div className="empty-deck">
                <span>Empty</span>
              </div>
            )}
          </div>
          
          <div className="discard-pile-container">
            {topCard && (
              <Card card={topCard} isAnimating={animateCard?.id === topCard.id} />
            )}
            <div className="pile-label">
              <span className="pile-text">DISCARD</span>
            </div>
          </div>
        </div>
        
        {unoWarning && (
          <div className="uno-warning-popup">
            ⚠️ {unoWarning} forgot UNO! +2 cards
          </div>
        )}
      </div>
      
      {/* Main player hand */}
      <div className="main-player-area">
        <div className="player-info-bar">
          <div className="player-avatar">
            <span className="avatar-icon">👤</span>
            <span className="player-label">{mainPlayer.name}</span>
          </div>
          
          {mainPlayer.hand.length === 1 && mainPlayer.unoCalled && (
            <div className="uno-called-badge">🎯 UNO!</div>
          )}
          
          {mainPlayer.hand.length === 2 && !mainPlayer.unoCalled && currentPlayer.id === mainPlayer.id && (
            <button onClick={callUno} className="uno-call-btn pulse">
              Call UNO!
            </button>
          )}
        </div>
        
        <div className="hand-area">
          <div className="cards-scroll">
            {mainPlayer.hand.map((card, index) => {
              const isPlayable = currentPlayer.id === mainPlayer.id &&
                (card.color === currentColor || 
                 card.color === "black" || 
                 card.value === topCard?.value);
              
              return (
                <div key={card.id} className="hand-card-slot">
                  <Card 
                    card={card} 
                    isPlayable={isPlayable && !gameOver} 
                    onClick={() => handleCardClick(card)} 
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        {showColorPicker && (
          <div className="color-picker-modal">
            <div className="color-picker-content">
              <h3>Choose a Color</h3>
              <div className="color-options">
                {COLORS.map(color => (
                  <button 
                    key={color} 
                    className={`color-btn ${color}`} 
                    onClick={() => handleColorSelect(color)}
                  >
                    <span className="color-circle" style={{ backgroundColor: `var(--${color})` }}></span>
                    <span className="color-label">{color}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Game over modal */}
      {gameOver && (
        <div className="modal-overlay">
          <div className="game-over-modal">
            <div className="winner-animation">
              <span className="trophy">🏆</span>
            </div>
            <h2 className="winner-text">{winner.name} Wins!</h2>
            <p className="winner-subtitle">Congratulations!</p>
            <div className="game-over-actions">
              <button onClick={startGame} className="play-again-btn">
                🔄 Play Again
              </button>
              <button onClick={resetGame} className="menu-btn-small">
                🏠 Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="turn-indicators">
        {players.map((player, index) => (
          <div 
            key={player.id} 
            className={`turn-dot ${currentPlayerIndex === index ? 'active' : ''}`}
            style={{ backgroundColor: currentPlayerIndex === index ? 'var(--yellow)' : '#555' }}
          ></div>
        ))}
      </div>
    </div>
  );
}

export default App;
