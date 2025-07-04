document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 상태 및 요소 관리 ---
    const appState = {
        currentDeck: null,
        currentSpread: null,
        shuffledDeck: [],
        manuallySelectedCards: new Set(),
        autoDrawnCards: [],
        drawMode: null, // 'manual', 'auto', 'continuous'
        continuousResults: [],
        continuousRound: 0,
        customLayout: [],
    };

    const SPREADS = {
        'one-card': { name: '원 카드', cards_to_draw: 1, positions: ['핵심 조언'] },
        'three-card': { name: '쓰리 카드', cards_to_draw: 3, positions: ['과거', '현재', '미래'] },
        'celtic-cross': { name: '켈틱 크로스', cards_to_draw: 10, positions: ["현재", "장애물", "과거", "미래", "의식", "무의식", "조언", "주변 환경", "희망과 두려움", "결과"] }
    };

    const screens = {};
    document.querySelectorAll('.screen').forEach(s => screens[s.id.replace('-screen', '')] = s);
    
    // 모든 버튼과 주요 요소들
    const elements = {
        deckList: document.getElementById('deck-list'),
        spreadList: document.getElementById('spread-list'),
        backButtons: document.querySelectorAll('.back-button'),
        // 커스텀 생성기
        numCardsInput: document.getElementById('num-cards-input'),
        setCardCountButton: document.getElementById('set-card-count-button'),
        layoutPreview: document.getElementById('layout-preview'),
        startCustomSpreadButton: document.getElementById('start-custom-spread-button'),
        // 뽑기 방식
        drawMethodList: document.getElementById('draw-method-list'),
        // 수동 뽑기
        manualDrawTitle: document.getElementById('manual-draw-title'),
        cardPool: document.getElementById('card-pool'),
        manualConfirmButton: document.getElementById('manual-confirm-button'),
        manualResetButton: document.getElementById('manual-reset-button'),
        // 자동/연속 뽑기
        autoDrawTitle: document.getElementById('auto-draw-title'),
        autoDrawButtons: document.getElementById('auto-draw-buttons'),
        autoResetButton: document.getElementById('auto-reset-button'),
        continuousResultArea: document.getElementById('continuous-result-area'),
        // 결과
        resultCards: document.getElementById('result-cards'),
        restartButton: document.getElementById('restart-button'),
    };

    // --- 2. 핵심 로직 함수 ---
    function showScreen(screenId) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenId].classList.add('active');
    }

    async function loadDeck(deckId) {
        try {
            const response = await fetch(`assets/data/${deckId}.json`);
            if (!response.ok) throw new Error('덱 데이터 로드 실패');
            appState.currentDeck = await response.json();
            return true;
        } catch (error) {
            alert(error.message);
            return false;
        }
    }

    function shuffleDeck() {
        let deck = [...appState.currentDeck.cards];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        appState.shuffledDeck = deck;
    }
    
    function resetAll() {
        appState.continuousResults = [];
        appState.continuousRound = 0;
        elements.continuousResultArea.innerHTML = '';
        showScreen('deckSelection');
    }

    // --- 3. 화면별 설정(Setup) 함수 ---

    function setupCustomSpreadCreator(cardCount) {
        elements.layoutPreview.innerHTML = '';
        if (cardCount < 1 || cardCount > 20) {
            alert("카드 수는 1장에서 20장 사이여야 합니다.");
            elements.numCardsInput.value = 3;
            cardCount = 3;
        }
        for (let i = 1; i <= cardCount; i++) {
            const cell = document.createElement('div');
            cell.classList.add('draggable-card');
            cell.dataset.id = i;
            cell.textContent = i;
            cell.draggable = true;
            // 초기 위치 랜덤하게 설정
            cell.style.left = `${Math.random() * 85}%`;
            cell.style.top = `${Math.random() * 85}%`;
            elements.layoutPreview.appendChild(cell);
        }
    }

    function setupManualDrawingScreen() {
        shuffleDeck();
        appState.manuallySelectedCards.clear();
        elements.manualConfirmButton.disabled = true;
        elements.manualDrawTitle.textContent = `아래 카드 중 ${appState.currentSpread.cards_to_draw}장을 선택하세요.`;
        elements.cardPool.innerHTML = '';
        
        const backImage = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;
        appState.currentDeck.cards.forEach((card, index) => {
            const container = document.createElement('div');
            container.className = 'card-container';
            container.dataset.cardIndex = index;
            container.innerHTML = `<img src="${backImage}" alt="카드 뒷면">`;
            elements.cardPool.appendChild(container);
        });
        showScreen('manualDrawing');
    }

    function setupAutoDrawingScreen() {
        shuffleDeck();
        appState.autoDrawnCards = [];
        elements.autoDrawButtons.innerHTML = '';
        elements.autoDrawTitle.textContent = `${appState.currentSpread.name} (${appState.currentSpread.cards_to_draw}장)`;

        if (appState.drawMode === 'continuous') {
            appState.continuousRound++;
        } else {
            elements.continuousResultArea.innerHTML = '';
        }

        for (let i = 0; i < appState.currentSpread.cards_to_draw; i++) {
            const button = document.createElement('button');
            button.className = 'auto-draw-button';
            button.textContent = i + 1;
            button.dataset.index = i;
            elements.autoDrawButtons.appendChild(button);
        }
        showScreen('autoDrawing');
    }
    
    // --- 4. 결과 렌더링 함수 ---
    
    function renderFinalResults(drawnCards) {
        elements.resultCards.innerHTML = '';
        drawnCards.forEach((card, index) => {
            const position = appState.currentSpread.positions[index] || `카드 ${index+1}`;
            const imagePath = appState.currentDeck.deckInfo.imagePath + card.image;
            const backImagePath = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;

            const resultContainer = document.createElement('div');
            resultContainer.className = 'result-card-container';

            const positionEl = document.createElement('p');
            positionEl.className = 'result-card-position';
            positionEl.textContent = position;

            const cardContainer = document.createElement('div');
            cardContainer.className = 'card-container';
            cardContainer.innerHTML = `
                <div class="card-flipper">
                    <img class="card-face back" src="${backImagePath}">
                    <div class="card-face front">
                        <img src="${imagePath}" alt="${card.name}">
                        <h4>${card.name}</h4>
                        <p><small>${card.keywords.join(', ')}</small></p>
                    </div>
                </div>`;
            
            resultContainer.appendChild(positionEl);
            resultContainer.appendChild(cardContainer);
            elements.resultCards.appendChild(resultContainer);

            setTimeout(() => cardContainer.classList.add('flipped'), 100 * (index + 1));
        });
        showScreen('result');
    }

    function renderContinuousResult() {
        const resultHTML = appState.autoDrawnCards.map((card, index) => {
             const position = appState.currentSpread.positions[index] || `카드 ${index+1}`;
             const imagePath = appState.currentDeck.deckInfo.imagePath + card.image;
             return `<div class="result-card-container">
                        <p class="result-card-position">${position}</p>
                        <div class="card-container">
                           <img src="${imagePath}" alt="${card.name}">
                        </div>
                        <h4>${card.name}</h4>
                     </div>`;
        }).join('');
        
        const setWrapper = document.createElement('div');
        setWrapper.className = 'continuous-result-set';
        setWrapper.innerHTML = `<h3>${appState.continuousRound}번째 결과</h3><div class="continuous-result-cards">${resultHTML}</div>`;
        elements.continuousResultArea.appendChild(setWrapper);
    }

    // --- 5. 이벤트 핸들러 ---
    
    // 덱 선택
    elements.deckList.addEventListener('click', async (e) => {
        const deckCard = e.target.closest('.deck-card');
        if (deckCard && await loadDeck(deckCard.dataset.deckId)) {
            showScreen('spreadSelection');
        }
    });
    
    // 스프레드 선택
    elements.spreadList.addEventListener('click', (e) => {
        const spreadButton = e.target.closest('.spread-button');
        if (!spreadButton) return;
        
        const type = spreadButton.dataset.spreadType;
        if (type === 'custom') {
            setupCustomSpreadCreator(parseInt(elements.numCardsInput.value));
            showScreen('customSpreadCreator');
        } else {
            appState.currentSpread = SPREADS[type];
            showScreen('drawMethod');
        }
    });

    // 뒤로가기 버튼들
    elements.backButtons.forEach(button => {
        button.addEventListener('click', () => showScreen(button.dataset.target));
    });

    // 커스텀 생성기
    elements.setCardCountButton.addEventListener('click', () => setupCustomSpreadCreator(parseInt(elements.numCardsInput.value)));
    
    // 드래그 앤 드롭 로직
    let draggedItem = null;
    elements.layoutPreview.addEventListener('dragstart', e => {
        draggedItem = e.target;
        setTimeout(() => e.target.classList.add('dragging'), 0);
    });
    elements.layoutPreview.addEventListener('dragend', e => e.target.classList.remove('dragging'));
    elements.layoutPreview.addEventListener('dragover', e => e.preventDefault());
    elements.layoutPreview.addEventListener('drop', e => {
        e.preventDefault();
        if(draggedItem) {
            const rect = elements.layoutPreview.getBoundingClientRect();
            draggedItem.style.left = `${e.clientX - rect.left - (draggedItem.offsetWidth / 2)}px`;
            draggedItem.style.top = `${e.clientY - rect.top - (draggedItem.offsetHeight / 2)}px`;
        }
    });
    
    elements.startCustomSpreadButton.addEventListener('click', () => {
        const cards = elements.layoutPreview.querySelectorAll('.draggable-card');
        appState.customLayout = Array.from(cards).map(c => ({
            left: c.style.left,
            top: c.style.top,
        }));
        appState.currentSpread = {
            name: "나만의 스프레드",
            cards_to_draw: cards.length,
            positions: Array.from({length: cards.length}, (_, i) => `위치 ${i+1}`)
        };
        showScreen('drawMethod');
    });

    // 뽑기 방식 선택
    elements.drawMethodList.addEventListener('click', (e) => {
        const methodButton = e.target.closest('.draw-method-button');
        if (!methodButton) return;
        appState.drawMode = methodButton.dataset.mode;
        
        if (appState.drawMode === 'manual') {
            setupManualDrawingScreen();
        } else { // auto, continuous
            setupAutoDrawingScreen();
        }
    });

    // 수동 뽑기
    elements.cardPool.addEventListener('click', (e) => {
        const cardContainer = e.target.closest('.card-container');
        if (!cardContainer) return;

        const index = cardContainer.dataset.cardIndex;
        if (appState.manuallySelectedCards.has(index)) {
            appState.manuallySelectedCards.delete(index);
            cardContainer.classList.remove('selected');
        } else {
            if (appState.manuallySelectedCards.size < appState.currentSpread.cards_to_draw) {
                appState.manuallySelectedCards.add(index);
                cardContainer.classList.add('selected');
            }
        }
        elements.manualConfirmButton.disabled = appState.manuallySelectedCards.size !== appState.currentSpread.cards_to_draw;
    });
    elements.manualResetButton.addEventListener('click', setupManualDrawingScreen);
    elements.manualConfirmButton.addEventListener('click', () => {
        const drawnCards = Array.from(appState.manuallySelectedCards).map(i => appState.currentDeck.cards[i]);
        renderFinalResults(drawnCards);
    });

    // 자동/연속 뽑기
    elements.autoDrawButtons.addEventListener('click', (e) => {
        const button = e.target.closest('.auto-draw-button');
        if (!button || button.disabled) return;

        button.disabled = true;
        const card = appState.shuffledDeck.pop();
        appState.autoDrawnCards[button.dataset.index] = card;

        const allDrawn = elements.autoDrawButtons.querySelectorAll('button:not(:disabled)').length === 0;
        if (allDrawn) {
            if (appState.drawMode === 'auto') {
                setTimeout(() => renderFinalResults(appState.autoDrawnCards), 500);
            } else { // continuous
                renderContinuousResult();
            }
        }
    });
    elements.autoResetButton.addEventListener('click', setupAutoDrawingScreen);

    // 처음으로
    elements.restartButton.addEventListener('click', resetAll);
    
    // 앱 시작
    loadDeck('universal_waite').then(() => console.log("기본 덱 로드 완료"));
});