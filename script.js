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
    const appState = { currentDeck: null, currentSpread: null, shuffledDeck: [], manuallySelectedCards: new Set(), autoDrawnCards: [], drawMode: null, continuousRound: 0, customLayout: [], zoomScale: 1, panX: 0, panY: 0};

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
        zoomPanContainer: document.getElementById('zoom-pan-container'),
        zoomInBtn: document.getElementById('zoom-in-btn'),
        zoomOutBtn: document.getElementById('zoom-out-btn'),
        zoomResetBtn: document.getElementById('zoom-reset-btn'),
        saveImageBtn: document.getElementById('save-image-btn'),
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
     * loadDeck: 현재 환경을 감지하여 특정 덱의 상세 데이터를 불러옵니다.
     * @param {string} deckId - 불러올 덱의 ID.
     * @returns {Promise<boolean>} - 로드 성공 여부.
     */
    async function loadDeck(deckId) {
        try {
            if (window.location.protocol === 'file:') {
                console.log(`[로컬] ${deckId} 덱 데이터를 로드합니다.`);
                // localMasterData 객체에서 해당 덱 데이터를 찾습니다.
                if (localMasterData && localMasterData.deckData[deckId]) {
                    appState.currentDeck = localMasterData.deckData[deckId];
                    return true;
                } else {
                    throw new Error(`${deckId}.json에 해당하는 로컬 데이터가 없습니다.`);
                }
            } else {
                console.log(`[웹] ${deckId}.json 파일을 fetch합니다.`);
                const response = await fetch(`assets/data/${deckId}.json`);
                if (!response.ok) throw new Error(`${deckId}.json 파일 로드 실패`);
                appState.currentDeck = await response.json();
                return true;
            }
        } catch (e) {
            alert(e.message);
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
                <div class="placeholder-text">위치 ${i}</div>
                <div class="placeholder-image">${i}</div>
                <div class="placeholder-name-text">카드 ${i}<br>(card ${i})</div>
            `;
            // --- 수정 끝 ---

            cell.style.left = `${(i - 1) * 110}px`;
            cell.style.top = `20px`;
            elements.layoutPreview.appendChild(cell);
        }
    }

    /**
     * setupManualDrawingScreen: '수동 뽑기' 화면을 설정합니다.
     */
    function setupManualDrawingScreen() {
        appState.manuallySelectedCards.clear();
        elements.manualConfirmButton.disabled = true;
        elements.manualDrawTitle.textContent = `아래 카드 중 ${appState.currentSpread.cards_to_draw}장을 선택하세요.`;
        elements.cardPool.innerHTML = '';

        let visualDeck = [...appState.currentDeck.cards];
        for (let i = visualDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [visualDeck[i], visualDeck[j]] = [visualDeck[j], visualDeck[i]];
        }
        const backImagePath = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;

        // 각 카드에 대해 컨테이너를 생성하고, 이미지 로드를 시도합니다.
        visualDeck.forEach(card => {
            const container = document.createElement('div');
            container.className = 'card-container';
            container.dataset.cardId = card.id;

            // 1. 실제 카드 뒷면 이미지를 로드하려고 시도하는 <img> 태그를 만듭니다.
            const poolImg = document.createElement('img');
            poolImg.src = backImagePath;
            poolImg.alt = "카드 뒷면";

            // 2. [핵심] 이미지 로드에 실패하면(onerror) 실행될 동작을 정의합니다.
            poolImg.onerror = function() {
                // 실패 시, <img> 태그를 아이콘이 있는 대체 <div>로 교체합니다.
                const placeholder = document.createElement('div');
                placeholder.className = 'card-pool-placeholder'; // CSS와 맞출 고유한 클래스 이름
                placeholder.innerHTML = '🔮';
                this.replaceWith(placeholder);
            };

            // 3. 생성한 <img>를 컨테이너에 추가합니다.
            container.appendChild(poolImg);
            elements.cardPool.appendChild(container);
        });
        
        showScreen('manualDrawing');
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
     * createResultCardElement: 결과 카드 하나의 HTML 요소를 생성하는 헬퍼 함수입니다.
     * @param {Object} card - 카드 데이터 객체.
     * @param {number} index - 카드의 순서 (인덱스).
     * @returns {HTMLElement} - 생성된 카드 컨테이너 div 요소.
     */

    function createResultCardElement(card, index) {
        const position = appState.currentSpread.positions[index] || `위치 ${index+1}`;
        const imagePath = card.image ? appState.currentDeck.deckInfo.imagePath + card.image : '';
        const backImagePath = appState.currentDeck.deckInfo.imagePath + appState.currentDeck.deckInfo.backImage;
    
        // --- 1. 컨테이너 및 기본 요소 생성 ---
        const container = document.createElement('div');
        container.className = 'result-card-container';
        container.dataset.position = index + 1;
    
        const positionP = document.createElement('p');
        positionP.className = 'result-card-position';
        positionP.textContent = position;
    
        const flipperWrapper = document.createElement('div');
        flipperWrapper.className = 'card-flipper-wrapper';
    
        const flipper = document.createElement('div');
        flipper.className = 'card-flipper';
    
        // ...
        // --- 2. 카드 뒷면 생성 ---
        const cardFaceBack = document.createElement('div');
        cardFaceBack.className = 'card-face back';
        
        const backImg = document.createElement('img');
        backImg.src = backImagePath;
        backImg.alt = "카드 뒷면";

        // [핵심] 뒷면 이미지를 불러오다 실패하면 실행
        backImg.onerror = function() {
            const placeholder = document.createElement('div');
            placeholder.className = 'card-back-placeholder';
            placeholder.innerHTML = '🔮'; // 심볼을 넣거나 비워둠
            this.replaceWith(placeholder);
        };
        cardFaceBack.appendChild(backImg);
        // ...
    
        // --- 3. 카드 앞면 생성 (핵심 로직) ---
        const cardFaceFront = document.createElement('div');
        cardFaceFront.className = 'card-face front';
    
        // 이미지를 표시할지, 대체 콘텐츠를 표시할지 결정
        if (imagePath) {
            // 이미지가 있는 경우, <img> 요소를 생성
            const frontImg = document.createElement('img');
            frontImg.src = imagePath;
            frontImg.alt = card.name;
    
            // [핵심] 이미지를 불러오다 실패하면(onerror) 실행될 함수를 지정
            frontImg.onerror = function() {
                // 'this'는 에러가 발생한 이미지(frontImg)를 가리킴
                // 대체 콘텐츠(placeholder)를 생성
                const placeholder = document.createElement('div');
                placeholder.className = 'card-front-no-image';
                placeholder.innerHTML = `
                    <span class="no-image-symbol">✧</span>
                    <h5 class="no-image-name">${card.name}</h5>
                `;
                // 에러가 난 이미지(this)를 생성한 대체 콘텐츠(placeholder)로 교체
                this.replaceWith(placeholder);
            };
            cardFaceFront.appendChild(frontImg);

        } else if (card.unicode) { // 유니코드 속성이 있는지 확인
        // 유니코드가 있으면, 유니코드 플레이스홀더를 생성
        cardFaceFront.innerHTML = `
            <div class="card-front-unicode">
                <span class="unicode-symbol">${card.unicode}</span>
            </div>
           `;

        } else {
            // JSON에 image 속성 자체가 없는 경우, 처음부터 대체 콘텐츠를 생성
            cardFaceFront.innerHTML = `
                <div class="card-front-no-image">
                    <span class="no-image-symbol">✧</span>
                    <h5 class="no-image-name">${card.name}</h5>
                </div>
            `;
        }
    
        // --- 4. 텍스트 래퍼 생성 ---
        const textWrapper = document.createElement('div');
        textWrapper.className = 'card-text-wrapper';
        textWrapper.innerHTML = `
            <h4>${card.name}</h4>
            <p class="keywords"><strong><small>${card.keywords.join(', ')}</small></strong></p>
            <p class="description"><small><small>${card.description || ''}</small></small></p>
         `;
    
        // --- 5. 모든 요소를 조립 ---
        flipper.appendChild(cardFaceBack);
        flipper.appendChild(cardFaceFront);
        flipperWrapper.appendChild(flipper);
    
        container.appendChild(positionP);
        container.appendChild(flipperWrapper);
        container.appendChild(textWrapper);
    
        return container;
    }

    /**
     * renderContinuousResult: '연속 뽑기'의 한 회차 결과를 렌더링합니다.
     * 이 함수는 뒤집히는 애니메이션 없이 바로 앞면을 보여줍니다.
     */

    // [최종 수정] 연속 뽑기 결과 렌더링 함수
    function renderContinuousResult() {
        const cardsWrapper = document.createElement('div');
        cardsWrapper.className = 'continuous-result-cards';
    
        appState.autoDrawnCards.forEach((card, index) => {
            const position = appState.currentSpread.positions[index] || `위치 ${index+1}`;
            const imagePath = card.image ? appState.currentDeck.deckInfo.imagePath + card.image : '';

            // 카드 컨테이너 생성
            const container = document.createElement('div');
            container.className = 'result-card-container';
            
            let frontContentHTML = '';
            // 이미지 또는 유니코드 콘텐츠 결정
            if (imagePath) {
                frontContentHTML = `<img src="${imagePath}" alt="${card.name}">`;
            } else if (card.unicode) {
                frontContentHTML = `<div class="card-front-unicode" style="height:100%;"><span class="unicode-symbol">${card.unicode}</span></div>`;
            } else {
                frontContentHTML = `<div class="card-front-no-image" style="height:100%;"><span class="no-image-symbol">✧</span><h5 class="no-image-name">${card.name}</h5></div>`;
            }
        
            // 최종 HTML 구조 생성
            container.innerHTML = `
                <p class="result-card-position">${position}</p>
                <div class="card-image-wrapper">${frontContentHTML}</div>
                <div class="card-text-wrapper">
                    <h4>${card.name}</h4>
                    <p class="keywords"><strong><small>${card.keywords.join(', ')}</small></strong></p>
                </div>
            `;

            // 이미지 로딩 실패 시 처리 (onerror)
            const imgElement = container.querySelector('img');
            if (imgElement) {
                imgElement.onerror = function() {
                    this.outerHTML = `<div class="card-front-no-image" style="height:100%;"><span class="no-image-symbol">✧</span><h5 class="no-image-name">${card.name}</h5></div>`;
                };
            }
    
            cardsWrapper.appendChild(container);
        });

        const setWrapper = document.createElement('div');
        setWrapper.className = 'continuous-result-set';
        setWrapper.innerHTML = `<h3>${appState.continuousRound}번째 결과</h3>`;
        setWrapper.appendChild(cardsWrapper);

        elements.continuousResultArea.appendChild(setWrapper);
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

    // ...
 // [추가] 확대/축소/이동을 적용하는 핵심 함수
    function applyTransform() {
        elements.zoomPanContainer.style.transform = `translate(${appState.panX}px, ${appState.panY}px) scale(${appState.zoomScale})`;
    }

    //확대 축소//
    // [추가] 모든 변환 상태를 초기화하는 함수
    function resetTransform() {
        appState.zoomScale = 1;
        appState.panX = 0;
        appState.panY = 0;
        applyTransform();
    }

    // [추가] 확대 버튼 이벤트
    elements.zoomInBtn.addEventListener('click', () => {
        appState.zoomScale = Math.min(3, appState.zoomScale * 1.2); // 최대 3배
        applyTransform();
    });

    // [추가] 축소 버튼 이벤트
    elements.zoomOutBtn.addEventListener('click', () => {
        appState.zoomScale = Math.max(0.5, appState.zoomScale / 1.2); // 최소 0.5배
        applyTransform();
    });

    // [추가] 리셋 버튼 이벤트
    elements.zoomResetBtn.addEventListener('click', resetTransform);

    // [추가] 이동(Pan) 기능 로직
    let isPanning = false;
    let startX, startY, initialPanX, initialPanY;

    elements.zoomPanContainer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        initialPanX = appState.panX;
        initialPanY = appState.panY;
        elements.zoomPanContainer.classList.add('panning');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        appState.panX = initialPanX + dx;
        appState.panY = initialPanY + dy;
        applyTransform();
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        elements.zoomPanContainer.classList.remove('panning');
    });

    // [추가] 터치스크린을 위한 이동 기능
    elements.zoomPanContainer.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        isPanning = true;
        startX = touch.clientX;
        startY = touch.clientY;
        initialPanX = appState.panX;
        initialPanY = appState.panY;
        elements.zoomPanContainer.classList.add('panning');
    });

    window.addEventListener('touchmove', (e) => {
        if (!isPanning) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        appState.panX = initialPanX + dx;
        appState.panY = initialPanY + dy;
        applyTransform();
    });

    window.addEventListener('touchend', () => {
        isPanning = false;
        elements.zoomPanContainer.classList.remove('panning');
    });

    // [수정] 뒤로가기, 처음으로 버튼 클릭 시 변환 상태 초기화
    elements.backButtons.forEach(b => {
        b.addEventListener('click', () => {
            if(screens.result.contains(b)) resetTransform(); // 결과창의 뒤로가기 버튼이면 리셋
            showScreen(b.dataset.target);
        });
    });

    elements.restartButton.addEventListener('click', () => {
        resetTransform();
        resetAll();
    });


    // [최종 완성] 결과 이미지를 저장하는 함수
    function saveResultAsImage() {
        const activeResultView = document.querySelector('.result-view.active');
        if (!activeResultView) {
            alert("저장할 결과가 없습니다.");
            return;
        }

        // 캡처 전에 잠시 변환 상태를 리셋합니다.
        const originalTransform = elements.zoomPanContainer.style.transform;
        elements.zoomPanContainer.style.transition = 'none';
        elements.zoomPanContainer.style.transform = 'translate(0, 0) scale(1)';
        
        document.body.classList.add('capturing');

        // [핵심 1] 캡처 대상과 내용물의 좌표를 둘 다 가져옵니다.
        const containerRect = elements.zoomPanContainer.getBoundingClientRect();
        const contentRect = activeResultView.getBoundingClientRect();
        
        // [핵심 2] 컨테이너 기준의 '상대 좌표'를 계산합니다.
        const relativeX = contentRect.left - containerRect.left;
        const relativeY = contentRect.top - containerRect.top;

        const padding = 30; // 이미지 가장자리에 추가할 여백 (조금 더 늘렸습니다)

        html2canvas(elements.zoomPanContainer, {
            backgroundColor: "#1a1a2e",
            useCORS: true,

            // [핵심 3] 계산된 '상대 좌표'를 기준으로 캡처 영역을 지정합니다.
            x: relativeX - padding,
            y: relativeY - padding,
            width: contentRect.width + (padding * 2),
            height: contentRect.height + (padding * 2)

        }).then(canvas => {
            const imageURL = canvas.toDataURL("image/png");
            const downloadLink = document.createElement('a');
            downloadLink.href = imageURL;
            downloadLink.download = "tarot-reading-result.png";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }).catch(err => {
            console.error("이미지 저장에 실패했습니다:", err);
            alert("이미지 저장 중 오류가 발생했습니다. 웹 서버 환경에서 실행 중인지 확인해주세요.");
        }).finally(() => {
            // 캡처 후 원래 변환 상태로 복구
            elements.zoomPanContainer.style.transition = 'transform 0.2s ease-in-out';
            elements.zoomPanContainer.style.transform = originalTransform;
            document.body.classList.remove('capturing');
        });
    }


    // [추가] 이미지 저장 버튼 이벤트 리스너
    elements.saveImageBtn.addEventListener('click', saveResultAsImage);


    /**
     * initializeApp: 앱 시작 시 덱 선택 화면을 초기화합니다.
     * 현재 환경을 감지하여 덱 목록을 불러옵니다.
     */
    async function initializeApp() {
        let decks = [];
        try {
            if (window.location.protocol === 'file:') {
                console.log("[로컬] 덱 목록을 로드합니다.");
                if (typeof localMasterData !== 'undefined' && localMasterData.decks) {
                    decks = localMasterData.decks;
                } else {
                     throw new Error("localMasterData.decks를 찾을 수 없습니다.");
                }
            } else {
                console.log("[웹] decks.json 파일을 fetch합니다.");
                const response = await fetch('assets/data/decks.json');
                if (!response.ok) throw new Error('decks.json 파일 로드 실패');
                decks = await response.json();
            }

            elements.deckList.innerHTML = ''; 
            decks.forEach(deck => {
                const deckElement = document.createElement('div');
                deckElement.className = 'deck-card';
                deckElement.dataset.deckId = deck.id;
                deckElement.innerHTML = `
                    <h3>${deck.name}</h3>
                    <p>${deck.description}</p>
                `;
                elements.deckList.appendChild(deckElement);
            });

        } catch (e) {
            elements.deckList.innerHTML = `<p style="color:red;">덱 목록을 불러오는 데 실패했습니다: ${e.message}</p>`;
        }
    }

    // 애플리케이션 시작
    initializeApp();
});