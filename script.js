// --- 1. 전역 변수 및 초기 설정 ---
document.addEventListener('DOMContentLoaded', () => {
    // 애플리케이션의 상태를 관리할 객체
    const appState = {
        currentDeck: null,
        currentSpread: null,
        shuffledDeck: [],
        drawnCards: [],
        cardsToDraw: 0,
    };

    // 스프레드 정보
    const SPREADS = {
        'one-card': { name: '원 카드', cards_to_draw: 1, positions: ['핵심 조언'] },
        'three-card': { name: '쓰리 카드', cards_to_draw: 3, positions: ['과거', '현재', '미래'] },
        'celtic-cross': { name: '켈틱 크로스', cards_to_draw: 10, positions: ["현재", "장애물", "과거", "미래", "의식", "무의식", "조언", "주변 환경", "희망과 두려움", "결과"] }
    };

    // HTML 요소 가져오기
    const screens = {
        deckSelection: document.getElementById('deck-selection-screen'),
        spreadSelection: document.getElementById('spread-selection-screen'),
        cardDrawing: document.getElementById('card-drawing-screen'),
        result: document.getElementById('result-screen'),
        customSpreadCreator: document.getElementById('custom-spread-creator-screen'),
    };
    
    const deckList = document.getElementById('deck-list');
    const spreadList = document.getElementById('spread-list');
    const cardPool = document.getElementById('card-pool');
    const resultCardsContainer = document.getElementById('result-cards');
    const drawInstruction = document.getElementById('draw-instruction');
    const restartButton = document.getElementById('restart-button');
    const setCardCountButton = document.getElementById('set-card-count-button');
    const numCardsInput = document.getElementById('num-cards-input');
    const positionInputsContainer = document.getElementById('position-inputs');
    const previewGrid = document.getElementById('preview-grid');
    const startCustomSpreadButton = document.getElementById('start-custom-spread-button');
    const backToSpreadsButton = document.getElementById('back-to-spreads-button');

    // --- 2. 핵심 함수 ---

    function showScreen(screenName) {
        for (const key in screens) {
            screens[key].classList.remove('active');
        }
        screens[screenName].classList.add('active');
    }

    async function loadDeck(deckId) {
        try {
            const response = await fetch(`assets/data/${deckId}.json`);
            if (!response.ok) {
                throw new Error('덱 데이터를 불러오는데 실패했습니다.');
            }
            const data = await response.json();
            appState.currentDeck = data;
            console.log(`${data.deckInfo.name} 덱이 로드되었습니다.`);
            return true;
        } catch (error) {
            console.error(error);
            alert(error.message);
            return false;
        }
    }
    
    function shuffleDeck(deck) {
        console.log("카드를 섞습니다...");
        let shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        appState.shuffledDeck = shuffled;
    }

    function setupCardDrawingScreen() {
        cardPool.innerHTML = '';
        drawInstruction.innerHTML = `아래 카드 중에서 <strong>${appState.cardsToDraw}장</strong>을 선택하세요.`;
        const backImagePath = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;
        for (let i = 0; i < appState.currentDeck.cards.length; i++) {
             const container = document.createElement('div');
             container.classList.add('card-container');
             container.dataset.cardIndex = i;
             const flipper = document.createElement('div');
             flipper.classList.add('card-flipper');
             const back = document.createElement('img');
             back.classList.add('card-face', 'back');
             back.src = backImagePath;
             back.alt = "카드 뒷면";
             const front = document.createElement('img');
             front.classList.add('card-face', 'front');
             flipper.appendChild(front);
             flipper.appendChild(back);
             container.appendChild(flipper);
             container.addEventListener('click', handleCardSelection, { once: true });
             cardPool.appendChild(container);
        }
    }
    
    function renderResults() {
        resultCardsContainer.innerHTML = ''; 
        appState.drawnCards.forEach((card, index) => {
            const position = appState.currentSpread.positions[index];
            const imagePath = appState.currentDeck.deckInfo.imagePath + card.image;
            const backImagePath = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;

            const resultContainer = document.createElement('div');
            resultContainer.classList.add('result-card-container');
            const positionEl = document.createElement('p');
            positionEl.classList.add('result-card-position');
            positionEl.textContent = `${index + 1}. ${position}`;
            
            const cardContainer = document.createElement('div');
            cardContainer.classList.add('card-container');
            const flipper = document.createElement('div');
            flipper.classList.add('card-flipper');
            const back = document.createElement('img');
            back.classList.add('card-face', 'back');
            back.src = backImagePath;
            const front = document.createElement('div');
            front.classList.add('card-face', 'front');
            front.innerHTML = `
                <img src="${imagePath}" alt="${card.name}">
                <h4>${card.name}</h4>
                <p><small>${card.keywords.join(', ')}</small></p>
            `;
            flipper.appendChild(front);
flipper.appendChild(back);
            cardContainer.appendChild(flipper);
            resultContainer.appendChild(positionEl);
            resultContainer.appendChild(cardContainer);
            resultCardsContainer.appendChild(resultContainer);
            
            setTimeout(() => {
                cardContainer.classList.add('flipped');
            }, 100 * (index + 1));
        });
        showScreen('result');
    }
    
    function resetApp() {
        appState.currentDeck = null;
        appState.currentSpread = null;
        appState.shuffledDeck = [];
        appState.drawnCards = [];
        appState.cardsToDraw = 0;
        showScreen('deckSelection');
    }

    function setupCustomSpreadCreator(cardCount) {
        positionInputsContainer.innerHTML = '';
        previewGrid.innerHTML = '';
        if (cardCount < 1 || cardCount > 20) {
            alert("카드 수는 1장에서 20장 사이여야 합니다.");
            numCardsInput.value = 3;
            cardCount = 3;
        }
        for (let i = 1; i <= cardCount; i++) {
            const group = document.createElement('div');
            group.classList.add('position-input-group');
            group.innerHTML = `
                <label for="pos-input-${i}">${i}.</label>
                <input type="text" id="pos-input-${i}" placeholder="예: 현재 상황, 조언">
            `;
            positionInputsContainer.appendChild(group);
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.textContent = i;
            previewGrid.appendChild(cell);
        }
    }

    // --- 3. 이벤트 핸들러 ---

    deckList.addEventListener('click', async (e) => {
        const selectedDeckDiv = e.target.closest('.deck-card');
        if (!selectedDeckDiv) return;
        const deckId = selectedDeckDiv.dataset.deckId;
        const success = await loadDeck(deckId);
        if (success) {
            showScreen('spreadSelection');
        }
    });

    spreadList.addEventListener('click', (e) => {
        const selectedSpreadButton = e.target.closest('.spread-button');
        if (!selectedSpreadButton) return;
        const spreadType = selectedSpreadButton.dataset.spreadType;
        if (spreadType === 'custom') {
            showScreen('customSpreadCreator');
            setupCustomSpreadCreator(parseInt(numCardsInput.value));
        } else {
            appState.currentSpread = SPREADS[spreadType];
            appState.cardsToDraw = appState.currentSpread.cards_to_draw;
            shuffleDeck(appState.currentDeck.cards);
            setupCardDrawingScreen();
            showScreen('cardDrawing');
        }
    });
    
    function handleCardSelection(e) {
        const selectedCardContainer = e.currentTarget;
        const drawnCard = appState.shuffledDeck.pop();
        appState.drawnCards.push(drawnCard);
        const frontFace = selectedCardContainer.querySelector('.front');
        frontFace.src = appState.currentDeck.deckInfo.imagePath + drawnCard.image;
        selectedCardContainer.classList.add('flipped');
        cardPool.style.pointerEvents = 'none';
        appState.cardsToDraw--;
        setTimeout(() => {
            drawInstruction.innerHTML = appState.cardsToDraw > 0 ?
                `<strong>${appState.cardsToDraw}장</strong>을 더 선택하세요.` :
                "결과를 확인합니다...";
            cardPool.style.pointerEvents = 'auto';
            if (appState.cardsToDraw === 0) {
                console.log("선택 완료:", appState.drawnCards);
                setTimeout(() => {
                    renderResults();
                }, 1500); 
            }
        }, 800);
    }
    
    restartButton.addEventListener('click', resetApp);
    
    setCardCountButton.addEventListener('click', () => {
        const count = parseInt(numCardsInput.value);
        setupCustomSpreadCreator(count);
    });

    backToSpreadsButton.addEventListener('click', () => {
        showScreen('spreadSelection');
    });

    startCustomSpreadButton.addEventListener('click', () => {
        const numCards = positionInputsContainer.children.length;
        let positions = [];
        for (let i = 1; i <= numCards; i++) {
            const input = document.getElementById(`pos-input-${i}`);
            positions.push(input.value || `카드 ${i}`);
        }
        appState.currentSpread = {
            name: '나만의 커스텀 스프레드',
            cards_to_draw: numCards,
            positions: positions
        };
        appState.cardsToDraw = numCards;
        shuffleDeck(appState.currentDeck.cards);
        setupCardDrawingScreen();
        showScreen('cardDrawing');
    });

    // --- 4. 초기화 ---
    resetApp();
});