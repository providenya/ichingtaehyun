document.addEventListener('DOMContentLoaded', () => {
    // 1. 상태 및 요소 관리
    const appState = { currentDeck: null, currentSpread: null, shuffledDeck: [], manuallySelectedCards: new Set(), autoDrawnCards: [], drawMode: null, continuousRound: 0, customLayout: [], };
    const SPREADS = { 'one-card': { name: '원 카드', cards_to_draw: 1, positions: ['핵심 조언'] }, 'three-card': { name: '쓰리 카드', cards_to_draw: 3, positions: ['과거', '현재', '미래'] }, 'celtic-cross': { name: '켈틱 크로스', cards_to_draw: 10, positions: ["현재", "장애물", "기반", "과거", "가능성", "미래", "자신", "주변", "희망/두려움", "결과"] } };
    const screens = {};
    document.querySelectorAll('.screen').forEach(s => { const key = s.id.replace(/-(\w)/g, (m, l) => l.toUpperCase()).replace('Screen', ''); screens[key] = s; });
    const elements = { deckList: document.getElementById('deck-list'), spreadList: document.getElementById('spread-list'), drawMethodList: document.getElementById('draw-method-list'), backButtons: document.querySelectorAll('.back-button'), numCardsInput: document.getElementById('num-cards-input'), setCardCountButton: document.getElementById('set-card-count-button'), layoutPreview: document.getElementById('layout-preview'), startCustomSpreadButton: document.getElementById('start-custom-spread-button'), manualDrawTitle: document.getElementById('manual-draw-title'), cardPool: document.getElementById('card-pool'), manualConfirmButton: document.getElementById('manual-confirm-button'), manualResetButton: document.getElementById('manual-reset-button'), autoDrawTitle: document.getElementById('auto-draw-title'), autoDrawButtons: document.getElementById('auto-draw-buttons'), autoResetButton: document.getElementById('auto-reset-button'), continuousDrawTitle: document.getElementById('continuous-draw-title'), continuousDrawButtons: document.getElementById('continuous-draw-buttons'), continuousResetButton: document.getElementById('continuous-reset-button'), continuousResultArea: document.getElementById('continuous-result-area'), restartButton: document.getElementById('restart-button'), resultDefaultView: document.getElementById('result-default-view'), resultCelticView: document.getElementById('result-celtic-view'), resultCustomView: document.getElementById('result-custom-view'), };

    // 2. 핵심 로직 함수
    const showScreen = (screenId) => { Object.values(screens).forEach(s => s.classList.remove('active')); screens[screenId].classList.add('active'); };
    const shuffleDeck = () => { let d=[...appState.currentDeck.cards]; for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];} appState.shuffledDeck=d; };
    const resetAll = () => { appState.continuousRound = 0; elements.continuousResultArea.innerHTML = ''; showScreen('deckSelection'); };
    async function loadDeck(deckId) { try { const r = await fetch(`assets/data/${deckId}.json`); if (!r.ok) throw Error('덱 데이터 로드 실패'); appState.currentDeck=await r.json(); return true; } catch (e) { alert(e.message); return false; } }

    // 3. 화면별 설정(Setup) 함수
    function setupCustomSpreadCreator(cardCount) {
        elements.layoutPreview.innerHTML = '';
        if (cardCount < 1 || cardCount > 20) { cardCount = 3; elements.numCardsInput.value = 3; alert("1~20장 사이로 입력해주세요."); }
        for (let i = 1; i <= cardCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'draggable-card'; cell.dataset.id = i; cell.textContent = i; cell.draggable = true;
            cell.style.left = `${(i - 1) * 180}px`; cell.style.top = `20px`;
            elements.layoutPreview.appendChild(cell);
        }
    }
    function setupManualDrawingScreen() {
        appState.manuallySelectedCards.clear();
        elements.manualConfirmButton.disabled = true;
        elements.manualDrawTitle.textContent = `아래 카드 중 ${appState.currentSpread.cards_to_draw}장을 선택하세요.`;
        elements.cardPool.innerHTML = '';
        let visualDeck = [...appState.currentDeck.cards];
        for(let i=visualDeck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[visualDeck[i],visualDeck[j]]=[visualDeck[j],visualDeck[i]];}
        const backImage = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;
        visualDeck.forEach(card => {
            const container = document.createElement('div');
            container.className = 'card-container'; container.dataset.cardId = card.id; 
            container.innerHTML = `<img src="${backImage}" alt="카드 뒷면">`;
            elements.cardPool.appendChild(container);
        });
        showScreen('manualDrawing');
    }
    function setupAutoDrawingScreen() {
        shuffleDeck(); appState.autoDrawnCards = []; elements.autoDrawButtons.innerHTML = '';
        elements.autoDrawTitle.textContent = `${appState.currentSpread.name} (${appState.currentSpread.cards_to_draw}장)`;
        for (let i = 0; i < appState.currentSpread.cards_to_draw; i++) {
            const button = document.createElement('button');
            button.className = 'auto-draw-button button'; button.textContent = i + 1; button.dataset.index = i;
            elements.autoDrawButtons.appendChild(button);
        }
        showScreen('autoDrawing');
    }
    function setupContinuousDrawingScreen() {
        shuffleDeck(); appState.autoDrawnCards = []; elements.continuousDrawButtons.innerHTML = '';
        elements.continuousDrawTitle.textContent = `${appState.currentSpread.name} (${appState.currentSpread.cards_to_draw}장)`;
        appState.continuousRound++;
        for (let i = 0; i < appState.currentSpread.cards_to_draw; i++) {
            const button = document.createElement('button');
            button.className = 'auto-draw-button button'; button.textContent = i + 1; button.dataset.index = i;
            elements.continuousDrawButtons.appendChild(button);
        }
        showScreen('continuousDrawing');
    }
    
    // 4. 결과 렌더링 함수
    function renderFinalResults(drawnCards) {
        document.querySelectorAll('.result-view').forEach(v => v.classList.remove('active'));
        const spreadType = appState.currentSpread.name;
        if (spreadType === '켈틱 크로스') renderCelticView(drawnCards);
        else if (spreadType === '나만의 스프레드') renderCustomView(drawnCards);
        else renderDefaultView(drawnCards);
        showScreen('result');
    }
    function renderDefaultView(drawnCards) {
        const view = elements.resultDefaultView; view.innerHTML = '';
        drawnCards.forEach((card, index) => {
            const cardElement = createResultCardElement(card, index);
            view.appendChild(cardElement);
            setTimeout(() => cardElement.querySelector('.card-flipper-wrapper').classList.add('flipped'), 100 * (index + 1));
        });
        view.classList.add('active');
    }
    function renderCelticView(drawnCards) {
        const view = elements.resultCelticView; view.innerHTML = '';
        view.dataset.view = 'celtic-cross';
        drawnCards.forEach((card, index) => {
            const cardElement = createResultCardElement(card, index);
            view.appendChild(cardElement);
            setTimeout(() => cardElement.querySelector('.card-flipper-wrapper').classList.add('flipped'), 100 * (index + 1));
        });
        view.classList.add('active');
    }
    function renderCustomView(drawnCards) {
        const view = elements.resultCustomView; view.innerHTML = '';
        drawnCards.forEach((card, index) => {
            const cardElement = createResultCardElement(card, index);
            if (appState.customLayout[index]) {
                cardElement.style.left = appState.customLayout[index].left;
                cardElement.style.top = appState.customLayout[index].top;
            }
            view.appendChild(cardElement);
            setTimeout(() => cardElement.querySelector('.card-flipper-wrapper').classList.add('flipped'), 100 * (index + 1));
        });
        view.classList.add('active');
    }
    
    /**
     * 결과 카드 하나의 HTML 요소를 생성하는 헬퍼 함수
     * --- 여기가 수정된 부분입니다 ---
     */
    function createResultCardElement(card, index) {
        const position = appState.currentSpread.positions[index] || `위치 ${index+1}`;
        const imagePath = card.image ? appState.currentDeck.deckInfo.imagePath + card.image : '';
        const backImagePath = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;
        const container = document.createElement('div');
        container.className = 'result-card-container';
        container.dataset.position = index + 1;
        // 위치 텍스트를 이미지 위로, 이름/키워드는 아래로 구조 변경
        container.innerHTML = `
            <p class="result-card-position">${position}</p> 
            <div class="card-flipper-wrapper">
                <div class="card-flipper">
                    <div class="card-face back"><img src="${backImagePath}" alt="카드 뒷면"></div>
                    <div class="card-face front">${imagePath ? `<img src="${imagePath}" alt="${card.name}">` : ''}</div>
                </div>
            </div>
            <div class="card-text-wrapper">
                <h4>${card.name}</h4>
                <p><small>${card.keywords.join(', ')}</small></p>
            </div>`;
        return container;
    }

    /** 연속 뽑기 결과를 렌더링하는 함수 */
    function renderContinuousResult() {
        const resultHTML = appState.autoDrawnCards.map((card, index) => {
             const position = appState.currentSpread.positions[index] || `위치 ${index+1}`;
             const imagePath = card.image ? appState.currentDeck.deckInfo.imagePath + card.image : '';
             return `<div class="result-card-container">
                        <p class="result-card-position">${position}</p>
                        <div class="card-image-wrapper card-container">
                           ${imagePath ? `<img src="${imagePath}" alt="${card.name}">` : '<span>이미지 없음</span>'}
                        </div>
                        <div class="card-text-wrapper"><h4>${card.name}</h4></div>
                     </div>`;
        }).join('');
        const setWrapper = document.createElement('div');
        setWrapper.className = 'continuous-result-set';
        setWrapper.innerHTML = `<h3>${appState.continuousRound}번째 결과</h3><div class="continuous-result-cards">${resultHTML}</div>`;
        elements.continuousResultArea.appendChild(setWrapper);
        setWrapper.scrollIntoView({ behavior: 'smooth' });
    }

    // --- 5. 이벤트 핸들러 ---
    elements.deckList.addEventListener('click', async (e) => { const el = e.target.closest('.deck-card'); if (el && await loadDeck(el.dataset.deckId)) showScreen('spreadSelection'); });
    elements.spreadList.addEventListener('click', (e) => { const el = e.target.closest('.spread-button'); if (!el) return; const type = el.dataset.spreadType; if (type === 'custom') { setupCustomSpreadCreator(parseInt(elements.numCardsInput.value)); showScreen('customSpreadCreator'); } else { appState.currentSpread = SPREADS[type]; showScreen('drawMethod'); } });
    elements.backButtons.forEach(b => b.addEventListener('click', () => showScreen(b.dataset.target)));
    elements.setCardCountButton.addEventListener('click', () => setupCustomSpreadCreator(parseInt(elements.numCardsInput.value)));
    let draggedItem = null, offsetX, offsetY;
    const GRID_SIZE = 20;
    elements.layoutPreview.addEventListener('dragstart', e => { draggedItem = e.target; offsetX = e.clientX - draggedItem.getBoundingClientRect().left; offsetY = e.clientY - draggedItem.getBoundingClientRect().top; setTimeout(() => e.target.classList.add('dragging'), 0); });
    elements.layoutPreview.addEventListener('dragend', e => e.target.classList.remove('dragging'));
    elements.layoutPreview.addEventListener('dragover', e => e.preventDefault());
    elements.layoutPreview.addEventListener('drop', e => { e.preventDefault(); if(draggedItem) { const rect = elements.layoutPreview.getBoundingClientRect(); let x = e.clientX - rect.left - offsetX; let y = e.clientY - rect.top - offsetY; draggedItem.style.left = `${Math.round(x / GRID_SIZE) * GRID_SIZE}px`; draggedItem.style.top = `${Math.round(y / GRID_SIZE) * GRID_SIZE}px`; }});
    elements.startCustomSpreadButton.addEventListener('click', () => { const cards = elements.layoutPreview.querySelectorAll('.draggable-card'); appState.customLayout = Array.from(cards).sort((a,b) => a.dataset.id - b.dataset.id).map(c => ({ left: c.style.left, top: c.style.top })); appState.currentSpread = { name: "나만의 스프레드", cards_to_draw: cards.length, positions: Array.from({length: cards.length}, (_, i) => `위치 ${i+1}`) }; showScreen('drawMethod'); });
    elements.drawMethodList.addEventListener('click', (e) => { const el = e.target.closest('.draw-method-button'); if (!el) return; appState.drawMode = el.dataset.mode; if (appState.drawMode === 'manual') setupManualDrawingScreen(); else if (appState.drawMode === 'auto') setupAutoDrawingScreen(); else if (appState.drawMode === 'continuous') setupContinuousDrawingScreen(); });
    elements.cardPool.addEventListener('click', (e) => { const el = e.target.closest('.card-container'); if (!el) return; const cardId = parseInt(el.dataset.cardId, 10); if (appState.manuallySelectedCards.has(cardId)) { appState.manuallySelectedCards.delete(cardId); el.classList.remove('selected'); } else { if (appState.manuallySelectedCards.size < appState.currentSpread.cards_to_draw) { appState.manuallySelectedCards.add(cardId); el.classList.add('selected'); } } elements.manualConfirmButton.disabled = appState.manuallySelectedCards.size !== appState.currentSpread.cards_to_draw; });
    elements.manualResetButton.addEventListener('click', setupManualDrawingScreen);
    elements.manualConfirmButton.addEventListener('click', () => { const drawnCards = Array.from(appState.manuallySelectedCards).map(id => appState.currentDeck.cards.find(card => card.id === id)); renderFinalResults(drawnCards); });
    [elements.autoDrawButtons, elements.continuousDrawButtons].forEach(container => {
        container.addEventListener('click', (e) => {
            const button = e.target.closest('.auto-draw-button');
            if (!button || button.disabled) return;
            button.disabled = true;
            const card = appState.shuffledDeck.pop();
            appState.autoDrawnCards[button.dataset.index] = card;
            const allDrawn = container.querySelectorAll('.auto-draw-button:not(:disabled)').length === 0;
            if (allDrawn) {
                if (appState.drawMode === 'auto') { setTimeout(() => renderFinalResults(appState.autoDrawnCards), 500); }
                else { renderContinuousResult(); }
            }
        });
    });
    elements.autoResetButton.addEventListener('click', setupAutoDrawingScreen);
    elements.continuousResetButton.addEventListener('click', setupContinuousDrawingScreen);
    elements.restartButton.addEventListener('click', resetAll);
    
    // 애플리케이션 시작
    loadDeck('universal_waite');
});