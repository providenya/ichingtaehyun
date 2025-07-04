document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 상태 및 요소 관리 ---
    const appState = {
        currentDeck: null, currentSpread: null, shuffledDeck: [],
        manuallySelectedCards: new Set(), autoDrawnCards: [], drawMode: null,
        continuousRound: 0, customLayout: [],
    };

    const SPREADS = {
        'one-card': { name: '원 카드', cards_to_draw: 1, positions: ['핵심 조언'] },
        'three-card': { name: '쓰리 카드', cards_to_draw: 3, positions: ['과거', '현재', '미래'] },
        'celtic-cross': { name: '켈틱 크로스', cards_to_draw: 10, positions: ["현재", "장애물", "기반", "과거", "가능성", "미래", "자신", "주변", "희망/두려움", "결과"] }
    };

    const screens = {};
    document.querySelectorAll('.screen').forEach(s => {
        const key = s.id.replace(/-(\w)/g, (m, l) => l.toUpperCase()).replace('Screen', '');
        screens[key] = s;
    });
    
    const elements = {
        deckList: document.getElementById('deck-list'),
        spreadList: document.getElementById('spread-list'),
        drawMethodList: document.getElementById('draw-method-list'),
        backButtons: document.querySelectorAll('.back-button'),
        numCardsInput: document.getElementById('num-cards-input'),
        setCardCountButton: document.getElementById('set-card-count-button'),
        layoutPreview: document.getElementById('layout-preview'),
        startCustomSpreadButton: document.getElementById('start-custom-spread-button'),
        manualDrawTitle: document.getElementById('manual-draw-title'),
        cardPool: document.getElementById('card-pool'),
        manualConfirmButton: document.getElementById('manual-confirm-button'),
        manualResetButton: document.getElementById('manual-reset-button'),
        autoDrawTitle: document.getElementById('auto-draw-title'),
        autoDrawButtons: document.getElementById('auto-draw-buttons'),
        autoResetButton: document.getElementById('auto-reset-button'),
        continuousResultArea: document.getElementById('continuous-result-area'),
        resultCardsGrid: document.getElementById('result-cards-grid'),
        restartButton: document.getElementById('restart-button'),
    };

    // --- 2. 핵심 로직 함수 ---
    const showScreen = (id) => { Object.values(screens).forEach(s => s.classList.remove('active')); screens[id].classList.add('active'); };
    const shuffleDeck = () => { let d=[...appState.currentDeck.cards]; for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];} appState.shuffledDeck=d; };
    const resetAll = () => { appState.continuousRound = 0; elements.continuousResultArea.innerHTML = ''; showScreen('deckSelection'); };
    async function loadDeck(id) { try { const r=await fetch(`assets/data/${id}.json`); if(!r.ok) throw Error(); appState.currentDeck=await r.json(); return true; } catch(e){ alert('덱 로드 실패'); return false; } }

    // --- 3. 화면별 설정 함수 ---
    const setupCustomCreator = (count) => {
        elements.layoutPreview.innerHTML = '';
        if (count < 1 || count > 20) { count = 3; elements.numCardsInput.value = 3; alert("1~20장 사이로 입력"); }
        for (let i = 1; i <= count; i++) {
            const cell = document.createElement('div');
            cell.className = 'draggable-card'; cell.dataset.id = i; cell.textContent = i; cell.draggable = true;
            cell.style.left = `${(i - 1) * 110}px`; cell.style.top = `20px`;
            elements.layoutPreview.appendChild(cell);
        }
    };
    const setupManualDrawing = () => {
        shuffleDeck(); appState.manuallySelectedCards.clear();
        elements.manualConfirmButton.disabled = true;
        elements.manualDrawTitle.textContent = `아래 카드 중 ${appState.currentSpread.cards_to_draw}장을 선택`;
        elements.cardPool.innerHTML = '';
        const backImg = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;
        appState.shuffledDeck.forEach((_, i) => {
            const c = document.createElement('div');
            c.className = 'card-container'; c.dataset.cardIndex = i;
            c.innerHTML = `<img src="${backImg}" alt="뒷면">`;
            elements.cardPool.appendChild(c);
        });
        showScreen('manualDrawing');
    };
    const setupAutoDrawing = () => {
        shuffleDeck(); appState.autoDrawnCards = [];
        elements.autoDrawButtons.innerHTML = '';
        elements.autoDrawTitle.textContent = `${appState.currentSpread.name} (${appState.currentSpread.cards_to_draw}장)`;
        if (appState.drawMode === 'continuous') { appState.continuousRound++; elements.autoResetButton.textContent = '다시 뽑기'; }
        else { elements.autoResetButton.textContent = '초기화'; }
        for (let i = 0; i < appState.currentSpread.cards_to_draw; i++) {
            const btn = document.createElement('button');
            btn.className = 'auto-draw-button button'; btn.textContent = i + 1; btn.dataset.index = i;
            elements.autoDrawButtons.appendChild(btn);
        }
        showScreen('autoDrawing');
    };

    // --- 4. 결과 렌더링 (CSS Grid 기반) ---
    function renderResults(drawnCards) {
        const grid = elements.resultCardsGrid;
        grid.innerHTML = '';
        grid.style.gridTemplateAreas = 'none'; // 초기화

        const isCustom = appState.currentSpread.name === "나만의 스프레드";
        const isCeltic = appState.currentSpread.name === "켈틱 크로스";

        // 그리드 템플릿 설정
        if (isCeltic) {
            grid.style.gridTemplateAreas = `
                ". . c5 . c10"
                "c4 c2 c6 . c9"
                ". c1 c . . c8"
                ". . c3 . c7"`;
        } else if (isCustom) {
            // 커스텀 레이아웃 그리드 동적 생성
            const { gridTemplateAreas, gridTemplateColumns, gridTemplateRows } = generateCustomGridLayout();
            grid.style.gridTemplateAreas = gridTemplateAreas;
            grid.style.gridTemplateColumns = gridTemplateColumns;
            grid.style.gridTemplateRows = gridTemplateRows;
        } else {
             grid.style.gridTemplateColumns = `repeat(${drawnCards.length}, 1fr)`;
        }

        drawnCards.forEach((card, index) => {
            const position = appState.currentSpread.positions[index] || `위치 ${index+1}`;
            const imagePath = card.image ? appState.currentDeck.deckInfo.imagePath + card.image : '';
            const backImagePath = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;
            
            const resultContainer = document.createElement('div');
            resultContainer.className = 'result-card-container';
            resultContainer.style.gridArea = isCeltic || isCustom ? `c${index + 1}` : 'auto';
            if (isCeltic && index === 1) resultContainer.style.transform = 'rotate(90deg)';


            resultContainer.innerHTML = `
                <p class="result-card-position">${position}</p>
                <div class="card-flipper-wrapper">
                    <div class="card-flipper">
                        <div class="card-face back"><img src="${backImagePath}" alt="뒷면"></div>
                        <div class="card-face front">${imagePath ? `<img src="${imagePath}" alt="${card.name}">` : ''}</div>
                    </div>
                </div>
                <div class="card-text-wrapper">
                    <h4>${card.name}</h4>
                    <p><small>${card.keywords.join(', ')}</small></p>
                </div>`;
            
            grid.appendChild(resultContainer);
            setTimeout(() => resultContainer.querySelector('.card-flipper-wrapper').classList.add('flipped'), 200 * (index + 1));
        });
        showScreen('result');
    }
    
    function generateCustomGridLayout() {
        const GRID_CELL_SIZE = 20;
        const positions = appState.customLayout.map(p => ({
            x: Math.round(parseInt(p.left) / GRID_CELL_SIZE),
            y: Math.round(parseInt(p.top) / GRID_CELL_SIZE)
        }));
        const maxX = Math.max(...positions.map(p => p.x)) + 1;
        const maxY = Math.max(...positions.map(p => p.y)) + 1;
        let grid = Array(maxY).fill(null).map(() => Array(maxX).fill('.'));
        positions.forEach((p, i) => grid[p.y][p.x] = `c${i+1}`);
        const gridTemplateAreas = grid.map(row => `"${row.join(' ')}"`).join(' ');
        const gridTemplateColumns = `repeat(${maxX}, auto)`;
        const gridTemplateRows = `repeat(${maxY}, auto)`;
        return { gridTemplateAreas, gridTemplateColumns, gridTemplateRows };
    }

    // --- 5. 이벤트 핸들러 ---
    elements.deckList.addEventListener('click', async (e) => { const el=e.target.closest('.deck-card'); if(el&&await loadDeck(el.dataset.deckId)) showScreen('spreadSelection'); });
    elements.spreadList.addEventListener('click', (e) => {
        const el = e.target.closest('.button'); if (!el) return;
        const type = el.dataset.spreadType;
        if (type === 'custom') { setupCustomCreator(parseInt(elements.numCardsInput.value)); showScreen('customSpreadCreator'); }
        else { appState.currentSpread = SPREADS[type]; showScreen('drawMethod'); }
    });
    elements.drawMethodList.addEventListener('click', (e) => {
        const el = e.target.closest('.button'); if (!el) return;
        appState.drawMode = el.dataset.mode;
        if (appState.drawMode === 'manual') setupManualDrawing(); else setupAutoDrawing();
    });

    elements.backButtons.forEach(b => b.addEventListener('click', () => showScreen(b.dataset.target)));
    elements.setCardCountButton.addEventListener('click', () => setupCustomCreator(parseInt(elements.numCardsInput.value)));
    
    let draggedItem, offsetX, offsetY; const GRID_SIZE=20;
    elements.layoutPreview.addEventListener('dragstart', e => { draggedItem=e.target; offsetX=e.clientX-draggedItem.getBoundingClientRect().left; offsetY=e.clientY-draggedItem.getBoundingClientRect().top; setTimeout(()=>e.target.classList.add('dragging'),0); });
    elements.layoutPreview.addEventListener('dragend', e => e.target.classList.remove('dragging'));
    elements.layoutPreview.addEventListener('dragover', e => e.preventDefault());
    elements.layoutPreview.addEventListener('drop', e => { e.preventDefault(); if(draggedItem){ const rect=elements.layoutPreview.getBoundingClientRect(); let x=e.clientX-rect.left-offsetX; let y=e.clientY-rect.top-offsetY; draggedItem.style.left=`${Math.round(x/GRID_SIZE)*GRID_SIZE}px`; draggedItem.style.top=`${Math.round(y/GRID_SIZE)*GRID_SIZE}px`; } });
    
    elements.startCustomSpreadButton.addEventListener('click', () => {
        const cards = elements.layoutPreview.querySelectorAll('.draggable-card');
        appState.customLayout = Array.from(cards).sort((a,b)=>a.dataset.id-b.dataset.id).map(c=>({left:c.style.left, top:c.style.top}));
        appState.currentSpread = { name:"나만의 스프레드", cards_to_draw:cards.length, positions:Array.from({length:cards.length},(_,i)=>`위치 ${i+1}`)};
        showScreen('drawMethod');
    });

    elements.cardPool.addEventListener('click', (e) => {
        const el = e.target.closest('.card-container'); if (!el) return;
        const index = el.dataset.cardIndex;
        if (appState.manuallySelectedCards.has(index)) { appState.manuallySelectedCards.delete(index); el.classList.remove('selected'); }
        else if (appState.manuallySelectedCards.size < appState.currentSpread.cards_to_draw) { appState.manuallySelectedCards.add(index); el.classList.add('selected'); }
        elements.manualConfirmButton.disabled = appState.manuallySelectedCards.size !== appState.currentSpread.cards_to_draw;
    });

    elements.manualResetButton.addEventListener('click', setupManualDrawing);
    elements.manualConfirmButton.addEventListener('click', () => { const drawn=Array.from(appState.manuallySelectedCards).map(i=>appState.shuffledDeck[i]); renderResults(drawn); });

    elements.autoDrawButtons.addEventListener('click', (e) => {
        const btn = e.target.closest('.auto-draw-button'); if (!btn || btn.disabled) return;
        btn.disabled = true;
        const card = appState.shuffledDeck.pop();
        appState.autoDrawnCards[btn.dataset.index] = card;
        if (elements.autoDrawButtons.querySelectorAll('button:not(:disabled)').length === 0) {
            if (appState.drawMode === 'auto') setTimeout(() => renderResults(appState.autoDrawnCards), 500);
            else { /* 연속뽑기는 현재 비활성화 상태이므로 로직 생략 */ }
        }
    });

    elements.autoResetButton.addEventListener('click', setupAutoDrawing);
    elements.restartButton.addEventListener('click', resetAll);
    
    loadDeck('universal_waite');
});