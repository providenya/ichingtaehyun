// DOM(Document Object Model) 콘텐츠가 모두 로드되면 스크립트를 실행합니다.
document.addEventListener('DOMContentLoaded', () => {
    // 1. 상태 및 요소 관리: 애플리케이션의 전반적인 상태와 자주 사용하는 HTML 요소를 관리합니다.

    /**
     * appState: 애플리케이션의 현재 상태를 저장하는 객체입니다.
     * - currentDeck: 현재 선택된 덱의 JSON 데이터.
     * - currentSpread: 현재 선택된 스프레드의 정보 (이름, 뽑을 카드 수 등).
     * - shuffledDeck: 섞인 카드 덱 배열.
     * - manuallySelectedCards: 수동 뽑기에서 사용자가 선택한 카드의 ID를 저장하는 Set.
     * - autoDrawnCards: 자동/연속 뽑기에서 뽑힌 카드 객체를 저장하는 배열.
     * - drawMode: 현재 뽑기 방식 ('manual', 'auto', 'continuous').
     * - continuousRound: 연속 뽑기의 현재 회차.
     * - customLayout: 사용자가 직접 만든 스프레드의 카드 위치 정보.
     */
    const appState = { currentDeck: null, currentSpread: null, shuffledDeck: [], manuallySelectedCards: new Set(), autoDrawnCards: [], drawMode: null, continuousRound: 0, customLayout: [], };

    // SPREADS: 미리 정의된 스프레드들의 정보를 담고 있는 상수 객체입니다.
    const SPREADS = {
        'one-card': { name: '원 카드', cards_to_draw: 1, positions: ['핵심 조언'] },
        'three-card': { name: '쓰리 카드', cards_to_draw: 3, positions: ['과거', '현재', '미래'] },
        'celtic-cross': { name: '켈틱 크로스', cards_to_draw: 10, positions: ["현재", "장애물", "기반", "과거", "가능성", "미래", "자신", "주변", "희망/두려움", "결과"] }
    };

    // screens: 모든 'screen' 클래스를 가진 div 요소를 관리하기 편하도록 객체에 저장합니다.
    const screens = {};
    document.querySelectorAll('.screen').forEach(s => {
        // 예: 'deck-selection-screen' -> 'deckSelection'으로 변환하여 키로 사용합니다.
        const key = s.id.replace(/-(\w)/g, (m, l) => l.toUpperCase()).replace('Screen', '');
        screens[key] = s;
    });

    // elements: 자주 사용되는 HTML 요소들을 미리 찾아와 객체에 저장하여 쉽게 접근할 수 있도록 합니다.
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
        continuousDrawTitle: document.getElementById('continuous-draw-title'),
        continuousDrawButtons: document.getElementById('continuous-draw-buttons'),
        continuousResetButton: document.getElementById('continuous-reset-button'),
        continuousResultArea: document.getElementById('continuous-result-area'),
        restartButton: document.getElementById('restart-button'),
        resultDefaultView: document.getElementById('result-default-view'),
        resultCelticView: document.getElementById('result-celtic-view'),
        resultCustomView: document.getElementById('result-custom-view'),
    };

    // 2. 핵심 로직 함수: 앱의 주요 기능을 담당하는 함수들입니다.

    /**
     * showScreen: 특정 화면(screen)을 사용자에게 보여주는 함수입니다.
     * @param {string} screenId - 보여줄 화면의 ID (screens 객체의 키).
     */
    const showScreen = (screenId) => {
        // 모든 화면을 일단 숨깁니다.
        Object.values(screens).forEach(s => s.classList.remove('active'));
        // 요청된 화면만 'active' 클래스를 추가하여 보여줍니다.
        screens[screenId].classList.add('active');
    };

    /**
     * shuffleDeck: 현재 선택된 덱을 섞는 함수입니다 (피셔-예이츠 셔플 알고리즘 사용).
     */
    const shuffleDeck = () => {
        // 원본 덱 데이터를 복사하여 섞습니다.
        let d = [...appState.currentDeck.cards];
        for (let i = d.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [d[i], d[j]] = [d[j], d[i]]; // 배열 요소의 위치를 서로 바꿉니다.
        }
        // 섞인 덱을 appState에 저장합니다.
        appState.shuffledDeck = d;
    };

    /**
     * resetAll: 모든 상태를 초기화하고 첫 화면(덱 선택)으로 돌아가는 함수입니다.
     */
    const resetAll = () => {
        appState.continuousRound = 0; // 연속 뽑기 회차 초기화
        elements.continuousResultArea.innerHTML = ''; // 연속 뽑기 결과 영역 비우기
        showScreen('deckSelection'); // 첫 화면으로 이동
    };

    /**
     * loadDeck: 지정된 덱의 JSON 데이터를 비동기적으로 불러오는 함수입니다.
     * @param {string} deckId - 불러올 덱의 ID (JSON 파일 이름).
     * @returns {Promise<boolean>} - 로드 성공 시 true, 실패 시 false를 반환합니다.
     */
    async function loadDeck(deckId) {
        try {
            const r = await fetch(`assets/data/${deckId}.json`);
            if (!r.ok) throw Error('덱 데이터 로드에 실패했습니다.');
            appState.currentDeck = await r.json(); // 성공 시 덱 데이터를 appState에 저장
            return true;
        } catch (e) {
            alert(e.message); // 실패 시 사용자에게 알림
            return false;
        }
    }

    // 3. 화면별 설정(Setup) 함수: 각 화면이 표시되기 전에 필요한 초기 설정을 수행합니다.

    /**
     * setupCustomSpreadCreator: '나만의 스프레드 만들기' 화면을 설정합니다.
     * @param {number} cardCount - 생성할 카드의 개수.
     */
    function setupCustomSpreadCreator(cardCount) {
        elements.layoutPreview.innerHTML = ''; // 미리보기 영역을 비웁니다.
        // 카드 개수가 1~20 범위를 벗어나면 경고하고 3으로 설정합니다.
        if (cardCount < 1 || cardCount > 20) {
            cardCount = 3;
            elements.numCardsInput.value = 3;
            alert("1장부터 20장 사이로 입력해주세요.");
        }
        // 지정된 개수만큼 드래그 가능한 카드 요소를 생성합니다.
        for (let i = 1; i <= cardCount; i++) {
            const cell = document.createElement('div');

        // 새 코드:
        cell.className = 'draggable-card';
        cell.dataset.id = i;
        cell.draggable = true;
        cell.innerHTML = `
            <div class="placeholder-image">${i}</div>
            <div class="placeholder-text">위치 ${i}</div>
        `;
        // --- 여기까지 수정 ---

            cell.style.left = `${(i - 1) * 110}px`;
            cell.style.top = `20px`;
            elements.layoutPreview.appendChild(cell);
        }
    }

    /**
     * setupManualDrawingScreen: '수동 뽑기' 화면을 설정합니다.
     */
    function setupManualDrawingScreen() {
        appState.manuallySelectedCards.clear(); // 이전에 선택했던 카드 목록을 비웁니다.
        elements.manualConfirmButton.disabled = true; // '결과 확인' 버튼을 비활성화합니다.
        elements.manualDrawTitle.textContent = `아래 카드 중 ${appState.currentSpread.cards_to_draw}장을 선택하세요.`; // 안내 문구 설정
        elements.cardPool.innerHTML = ''; // 카드 풀 영역을 비웁니다.

        // 덱의 모든 카드를 시각적으로 섞어서 보여주기 위해 복사 및 셔플합니다.
        let visualDeck = [...appState.currentDeck.cards];
        for (let i = visualDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [visualDeck[i], visualDeck[j]] = [visualDeck[j], visualDeck[i]];
        }
        // 카드 뒷면 이미지 경로를 가져옵니다.
        const backImage = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;
        // 섞인 덱의 각 카드에 대해 뒷면 이미지를 가진 요소를 생성하여 카드 풀에 추가합니다.
        visualDeck.forEach(card => {
            const container = document.createElement('div');
            container.className = 'card-container';
            container.dataset.cardId = card.id; // 실제 카드 ID를 저장
            container.innerHTML = `<img src="${backImage}" alt="카드 뒷면">`;
            elements.cardPool.appendChild(container);
        });
        showScreen('manualDrawing'); // 수동 뽑기 화면을 보여줍니다.
    }

    /**
     * setupAutoDrawingScreen: '자동 뽑기' 화면을 설정합니다.
     */
    function setupAutoDrawingScreen() {
        shuffleDeck(); // 덱을 섞습니다.
        appState.autoDrawnCards = []; // 이전에 뽑은 카드 목록을 비웁니다.
        elements.autoDrawButtons.innerHTML = ''; // 뽑기 버튼 영역을 비웁니다.
        elements.autoDrawTitle.textContent = `${appState.currentSpread.name} (${appState.currentSpread.cards_to_draw}장)`; // 안내 문구 설정
        // 뽑아야 할 카드 수만큼 버튼을 생성합니다.
        for (let i = 0; i < appState.currentSpread.cards_to_draw; i++) {
            const button = document.createElement('button');
            button.className = 'auto-draw-button button';
            button.textContent = i + 1; // 버튼에 1부터 시작하는 번호 표시
            button.dataset.index = i; // 나중에 뽑힌 카드를 저장할 배열의 인덱스

            // --- 여기가 수정된 부분입니다 ---
            // 첫 번째 버튼(i === 0)이 아니면 비활성화 상태로 시작합니다.
            if (i !== 0) {
                button.disabled = true;
            }
            // --- 수정 끝 ---

            elements.autoDrawButtons.appendChild(button);
        }
        showScreen('autoDrawing'); // 자동 뽑기 화면을 보여줍니다.
    }

    /**
     * setupContinuousDrawingScreen: '연속 뽑기' 화면을 설정합니다.
     */
    function setupContinuousDrawingScreen() {
        shuffleDeck(); // 덱을 섞습니다.
        appState.autoDrawnCards = []; // 이전에 뽑은 카드 목록을 비웁니다.
        elements.continuousDrawButtons.innerHTML = ''; // 뽑기 버튼 영역을 비웁니다.
        elements.continuousDrawTitle.textContent = `${appState.currentSpread.name} (${appState.currentSpread.cards_to_draw}장)`; // 안내 문구 설정
        appState.continuousRound++; // 연속 뽑기 회차를 1 증가시킵니다.
        // 뽑아야 할 카드 수만큼 버튼을 생성합니다.
        for (let i = 0; i < appState.currentSpread.cards_to_draw; i++) {
            const button = document.createElement('button');
            button.className = 'auto-draw-button button';
            button.textContent = i + 1;
            button.dataset.index = i;

            // --- 여기가 추가/수정된 부분입니다 ---
            // 첫 번째 버튼(i === 0)이 아니면 비활성화 상태로 시작합니다.
            if (i !== 0) {
                button.disabled = true;
            }
            // --- 수정 끝 ---

            elements.continuousDrawButtons.appendChild(button);
        }
        showScreen('continuousDrawing'); // 연속 뽑기 화면을 보여줍니다.
    }

    // 4. 결과 렌더링 함수: 뽑힌 카드를 화면에 표시하는 함수들입니다.

    /**
     * renderFinalResults: 최종 결과 화면을 렌더링하는 메인 함수입니다.
     * 스프레드 종류에 따라 적절한 뷰 렌더링 함수를 호출합니다.
     * @param {Array<Object>} drawnCards - 뽑힌 카드 객체들의 배열.
     */
    function renderFinalResults(drawnCards) {
        // 모든 결과 뷰를 일단 숨깁니다.
        document.querySelectorAll('.result-view').forEach(v => v.classList.remove('active'));
        const spreadType = appState.currentSpread.name;
        // 스프레드 이름에 따라 다른 렌더링 함수를 호출합니다.
        if (spreadType === '켈틱 크로스') renderCelticView(drawnCards);
        else if (spreadType === '나만의 스프레드') renderCustomView(drawnCards);
        else renderDefaultView(drawnCards);
        showScreen('result'); // 최종 결과 화면을 보여줍니다.
    }

    /**
     * renderDefaultView: 기본(원 카드, 쓰리 카드 등) 결과 화면을 렌더링합니다.
     * @param {Array<Object>} drawnCards - 뽑힌 카드 객체들의 배열.
     */
    function renderDefaultView(drawnCards) {
        const view = elements.resultDefaultView;
        view.innerHTML = ''; // 뷰 영역을 비웁니다.
        // 각 카드에 대해 결과 카드 요소를 생성하고 뷰에 추가합니다.
        drawnCards.forEach((card, index) => {
            const cardElement = createResultCardElement(card, index);
            view.appendChild(cardElement);
            // 순차적으로 카드가 뒤집히는 애니메이션 효과를 줍니다.
            setTimeout(() => cardElement.querySelector('.card-flipper-wrapper').classList.add('flipped'), 100 * (index + 1));
        });
        view.classList.add('active'); // 뷰를 활성화하여 보여줍니다.
    }

    /**
     * renderCelticView: 켈틱 크로스 결과 화면을 렌더링합니다.
     * @param {Array<Object>} drawnCards - 뽑힌 카드 객체들의 배열.
     */
    function renderCelticView(drawnCards) {
        const view = elements.resultCelticView;
        view.innerHTML = '';
        view.dataset.view = 'celtic-cross'; // CSS에서 위치를 잡기 위한 데이터 속성 설정
        drawnCards.forEach((card, index) => {
            const cardElement = createResultCardElement(card, index);
            view.appendChild(cardElement);
            // 순차적 플립 애니메이션
            setTimeout(() => cardElement.querySelector('.card-flipper-wrapper').classList.add('flipped'), 100 * (index + 1));
        });
        view.classList.add('active');
    }

    /**
     * renderCustomView: '나만의 스프레드' 결과 화면을 렌더링합니다.
     * @param {Array<Object>} drawnCards - 뽑힌 카드 객체들의 배열.
     */
    function renderCustomView(drawnCards) {
        const view = elements.resultCustomView;
        view.innerHTML = '';
        drawnCards.forEach((card, index) => {
            const cardElement = createResultCardElement(card, index);
            // 사용자가 설정한 위치 정보를 가져와 카드 스타일에 적용합니다.
            if (appState.customLayout[index]) {
                cardElement.style.left = appState.customLayout[index].left;
                cardElement.style.top = appState.customLayout[index].top;
            }
            view.appendChild(cardElement);
            // 순차적 플립 애니메이션
            setTimeout(() => cardElement.querySelector('.card-flipper-wrapper').classList.add('flipped'), 100 * (index + 1));
        });
        view.classList.add('active');
    }

    /**
     * --- 여기가 수정된 부분입니다 ---
     * createResultCardElement: 결과 카드 하나의 HTML 요소를 생성하는 헬퍼 함수입니다.
     * @param {Object} card - 카드 데이터 객체.
     * @param {number} index - 카드의 순서 (인덱스).
     * @returns {HTMLElement} - 생성된 카드 컨테이너 div 요소.
     */
    function createResultCardElement(card, index) {
        // 카드의 위치(ex: '과거', '현재') 텍스트를 가져옵니다. 없으면 '위치 n'으로 표시합니다.
        const position = appState.currentSpread.positions[index] || `위치 ${index+1}`;
        // 카드 앞면과 뒷면 이미지 경로를 설정합니다.
        const imagePath = card.image ? appState.currentDeck.deckInfo.imagePath + card.image : '';
        const backImagePath = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;

        // 카드 전체를 감싸는 컨테이너 요소를 생성합니다.
        const container = document.createElement('div');
        container.className = 'result-card-container';
        container.dataset.position = index + 1; // CSS에서 위치를 잡기 위한 데이터 속성

        // 요구사항 1번: HTML 구조 변경 (위치 -> 이미지 -> 이름/키워드)
        // 카드 내부의 HTML 구조를 정의합니다.
        container.innerHTML = `
            <p class="result-card-position">${position}</p> <!-- 1. 위치 텍스트 -->
            <div class="card-flipper-wrapper"> <!-- 카드 플립 애니메이션을 위한 래퍼 -->
                <div class="card-flipper">
                    <div class="card-face back"><img src="${backImagePath}" alt="카드 뒷면"></div> <!-- 카드 뒷면 -->
                    <div class="card-face front">${imagePath ? `<img src="${imagePath}" alt="${card.name}">` : ''}</div> <!-- 카드 앞면 (이미지) -->
                </div>
            </div>
            <div class="card-text-wrapper"> <!-- 2. 이름 및 키워드 텍스트 -->
                <h4>${card.name}</h4>
                <p><small>${card.keywords.join(', ')}</small></p>
            </div>`;
        return container; // 완성된 카드 요소를 반환합니다.
    }

    /**
     * renderContinuousResult: '연속 뽑기'의 한 회차 결과를 렌더링합니다.
     * 이 함수는 뒤집히는 애니메이션 없이 바로 앞면을 보여줍니다.
     */
    function renderContinuousResult() {
        // 뽑힌 카드들로 HTML 문자열을 생성합니다.
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
        // 한 회차의 결과를 감싸는 div를 생성합니다.
        const setWrapper = document.createElement('div');
        setWrapper.className = 'continuous-result-set';
        setWrapper.innerHTML = `<h3>${appState.continuousRound}번째 결과</h3><div class="continuous-result-cards">${resultHTML}</div>`;
        // 결과 영역에 새로운 회차 결과를 추가합니다.
        elements.continuousResultArea.appendChild(setWrapper);
        // 새로 추가된 결과가 보이도록 스크롤을 이동시킵니다.
        setWrapper.scrollIntoView({ behavior: 'smooth' });
    }

    // --- 5. 이벤트 핸들러: 사용자의 상호작용(클릭, 드래그 등)을 처리합니다. ---

    // 덱 선택 화면: 덱 카드를 클릭했을 때
    elements.deckList.addEventListener('click', async (e) => {
        const el = e.target.closest('.deck-card'); // 클릭된 요소가 .deck-card 또는 그 자식인지 확인
        // 덱 데이터를 성공적으로 불러오면 스프레드 선택 화면으로 이동
        if (el && await loadDeck(el.dataset.deckId)) {
            showScreen('spreadSelection');
        }
    });

    // 스프레드 선택 화면: 스프레드 버튼을 클릭했을 때
    elements.spreadList.addEventListener('click', (e) => {
        const el = e.target.closest('.spread-button');
        if (!el) return;
        const type = el.dataset.spreadType;
        if (type === 'custom') { // '나만의 스프레드'를 선택한 경우
            setupCustomSpreadCreator(parseInt(elements.numCardsInput.value)); // 생성기 화면 설정
            showScreen('customSpreadCreator');
        } else { // 미리 정의된 스프레드를 선택한 경우
            appState.currentSpread = SPREADS[type]; // 선택한 스프레드 정보를 상태에 저장
            showScreen('drawMethod'); // 뽑기 방식 선택 화면으로 이동
        }
    });

    // 뒤로가기 버튼들: 클릭 시 data-target에 지정된 화면으로 이동
    elements.backButtons.forEach(b => {
        b.addEventListener('click', () => showScreen(b.dataset.target));
    });

    // 커스텀 스프레드 생성기: '설정' 버튼 클릭 시
    elements.setCardCountButton.addEventListener('click', () => {
        // 입력된 카드 수로 생성기 화면을 다시 설정
        setupCustomSpreadCreator(parseInt(elements.numCardsInput.value));
    });

    // 커스텀 스프레드 생성기: 드래그 앤 드롭 로직
    let draggedItem = null, offsetX, offsetY;
    const GRID_SIZE = 20; // 그리드 크기 (20px 단위로 스냅)
    elements.layoutPreview.addEventListener('dragstart', e => { // 드래그 시작
        draggedItem = e.target;
        // 마우스 포인터와 요소의 좌상단 모서리 사이의 간격을 계산
        offsetX = e.clientX - draggedItem.getBoundingClientRect().left;
        offsetY = e.clientY - draggedItem.getBoundingClientRect().top;
        setTimeout(() => e.target.classList.add('dragging'), 0); // 드래그 중인 요소에 스타일 적용
    });
    elements.layoutPreview.addEventListener('dragend', e => { // 드래그 종료
        e.target.classList.remove('dragging');
    });
    elements.layoutPreview.addEventListener('dragover', e => { // 드롭 영역 위에서 드래그 중
        e.preventDefault(); // 기본 동작(드롭 방지)을 막아 드롭이 가능하게 함
    });
    elements.layoutPreview.addEventListener('drop', e => { // 드롭 발생
        e.preventDefault();
        if (draggedItem) {
            const rect = elements.layoutPreview.getBoundingClientRect();
            // 드롭 영역 내의 상대 좌표 계산
            let x = e.clientX - rect.left - offsetX;
            let y = e.clientY - rect.top - offsetY;
            // 그리드에 맞춰 위치 조정 (스냅 효과)
            draggedItem.style.left = `${Math.round(x / GRID_SIZE) * GRID_SIZE}px`;
            draggedItem.style.top = `${Math.round(y / GRID_SIZE) * GRID_SIZE}px`;
        }
    });

    // 커스텀 스프레드 생성기: '이 스프레드로 점보기' 버튼 클릭 시
    elements.startCustomSpreadButton.addEventListener('click', () => {
        const cards = elements.layoutPreview.querySelectorAll('.draggable-card');
        // 배치된 카드들의 위치 정보를 순서대로 저장
        appState.customLayout = Array.from(cards)
            .sort((a, b) => a.dataset.id - b.dataset.id) // 카드 번호 순으로 정렬
            .map(c => ({ left: c.style.left, top: c.style.top }));
        // 커스텀 스프레드 정보를 상태에 저장
        appState.currentSpread = {
            name: "나만의 스프레드",
            cards_to_draw: cards.length,
            positions: Array.from({ length: cards.length }, (_, i) => `위치 ${i+1}`)
        };
        showScreen('drawMethod'); // 뽑기 방식 선택 화면으로 이동
    });

    // 뽑기 방식 선택 화면: 버튼 클릭 시
    elements.drawMethodList.addEventListener('click', (e) => {
        const el = e.target.closest('.draw-method-button');
        if (!el) return;
        appState.drawMode = el.dataset.mode; // 선택된 모드를 상태에 저장
        // 모드에 따라 적절한 화면 설정 함수 호출
        if (appState.drawMode === 'manual') setupManualDrawingScreen();
        else if (appState.drawMode === 'auto') setupAutoDrawingScreen();
        else if (appState.drawMode === 'continuous') setupContinuousDrawingScreen();
    });

    // 수동 뽑기 화면: 카드 풀에서 카드를 클릭했을 때
    elements.cardPool.addEventListener('click', (e) => {
        const el = e.target.closest('.card-container');
        if (!el) return;
        const cardId = parseInt(el.dataset.cardId, 10);
        if (appState.manuallySelectedCards.has(cardId)) { // 이미 선택된 카드인 경우
            appState.manuallySelectedCards.delete(cardId); // 선택 해제
            el.classList.remove('selected');
        } else { // 새로 선택하는 경우
            // 뽑아야 할 카드 수보다 적게 선택했을 때만 추가
            if (appState.manuallySelectedCards.size < appState.currentSpread.cards_to_draw) {
                appState.manuallySelectedCards.add(cardId);
                el.classList.add('selected');
            }
        }
        // 선택한 카드 수가 뽑아야 할 카드 수와 같을 때만 '결과 확인' 버튼 활성화
        elements.manualConfirmButton.disabled = appState.manuallySelectedCards.size !== appState.currentSpread.cards_to_draw;
    });

    // 수동 뽑기 화면: '초기화' 버튼
    elements.manualResetButton.addEventListener('click', setupManualDrawingScreen);

    // 수동 뽑기 화면: '결과 확인' 버튼
    elements.manualConfirmButton.addEventListener('click', () => {
        // 선택된 카드 ID를 기반으로 실제 카드 객체 배열을 생성
        const drawnCards = Array.from(appState.manuallySelectedCards)
            .map(id => appState.currentDeck.cards.find(card => card.id === id));
        renderFinalResults(drawnCards); // 최종 결과 렌더링
    });

    // 자동/연속 뽑기 화면: 뽑기 버튼들을 감싸는 컨테이너에 이벤트 리스너 추가
    [elements.autoDrawButtons, elements.continuousDrawButtons].forEach(container => {
        container.addEventListener('click', (e) => {
            const button = e.target.closest('.auto-draw-button');
            if (!button || button.disabled) return; // 버튼이 아니거나 이미 비활성화된 버튼이면 무시

            button.disabled = true; // 클릭된 버튼을 비활성화
            const card = appState.shuffledDeck.pop(); // 섞인 덱에서 카드 한 장을 뽑음
            appState.autoDrawnCards[button.dataset.index] = card; // 해당 버튼의 인덱스에 카드 저장

            // --- 여기가 수정된 부분입니다 ---
            // 다음 버튼을 찾아 활성화하는 로직
            const nextButton = button.nextElementSibling; // 현재 클릭한 버튼의 바로 다음 형제 요소를 찾습니다.
            if (nextButton) { // 다음 버튼이 존재하면
                nextButton.disabled = false; // 해당 버튼을 활성화합니다.
            }
            // --- 수정 끝 ---

            // 모든 버튼이 비활성화되었는지 (즉, 모든 카드를 뽑았는지) 확인
            const allDrawn = container.querySelectorAll('.auto-draw-button:not(:disabled)').length === 0;

            if (allDrawn) {
                if (appState.drawMode === 'auto') { // 자동 뽑기 모드일 경우
                    setTimeout(() => renderFinalResults(appState.autoDrawnCards), 500); // 0.5초 후 최종 결과 표시
                } else { // 연속 뽑기 모드일 경우
                    renderContinuousResult(); // 이번 회차 결과를 표시
                }
            }
        });
    });

    // 자동 뽑기 화면: '초기화' 버튼
    elements.autoResetButton.addEventListener('click', setupAutoDrawingScreen);

    // 연속 뽑기 화면: '다시 뽑기' 버튼
    elements.continuousResetButton.addEventListener('click', setupContinuousDrawingScreen);
    
    // 최종 결과 화면: '처음으로 돌아가기' 버튼
    elements.restartButton.addEventListener('click', resetAll);

    // 애플리케이션 시작: 기본 덱을 로드합니다.
    loadDeck('universal_waite');
});