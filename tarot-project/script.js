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
    };
    
    const deckList = document.getElementById('deck-list');
    const spreadList = document.getElementById('spread-list');
    const cardPool = document.getElementById('card-pool');
    const resultCardsContainer = document.getElementById('result-cards');
    const drawInstruction = document.getElementById('draw-instruction');
    const restartButton = document.getElementById('restart-button');


    // --- 2. 핵심 함수 ---

    // 화면 전환 함수
    function showScreen(screenName) {
        // 모든 화면을 숨김
        for (const key in screens) {
            screens[key].classList.remove('active');
        }
        // 지정된 화면만 표시
        screens[screenName].classList.add('active');
    }

    // 덱 데이터 로드 함수
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
    
    // 카드 섞기 함수 (Fisher-Yates 알고리즘)
    function shuffleDeck(deck) {
        console.log("카드를 섞습니다...");
        let shuffled = [...deck]; // 원본 배열 복사
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // 요소 교환
        }
        appState.shuffledDeck = shuffled;
    }

    // 카드 뽑기 화면 설정 함수
    function setupCardDrawingScreen() {
        cardPool.innerHTML = ''; // 기존 카드들 초기화
        drawInstruction.innerHTML = `아래 카드 중에서 <strong>${appState.cardsToDraw}장</strong>을 선택하세요.`;

        for (let i = 0; i < appState.currentDeck.cards.length; i++) {
            const cardBack = document.createElement('div');
            cardBack.classList.add('card-back');
            cardBack.addEventListener('click', handleCardSelection, { once: true }); // 한번만 클릭되도록 설정
            cardPool.appendChild(cardBack);
        }
    }
    
    // 결과 화면 렌더링 함수
    function renderResults() {
        resultCardsContainer.innerHTML = ''; // 기존 결과 초기화
        appState.drawnCards.forEach((card, index) => {
            const position = appState.currentSpread.positions[index];
            
            const container = document.createElement('div');
            container.classList.add('result-card-container');
            
            const positionEl = document.createElement('p');
            positionEl.classList.add('result-card-position');
            positionEl.textContent = `${index + 1}. ${position}`;
            
            const cardEl = document.createElement('div');
            cardEl.classList.add('card-front');
            cardEl.innerHTML = `
                <h4>${card.name}</h4>
                <p><small>${card.keywords.join(', ')}</small></p>
            `;
            // 여기에 실제 카드 이미지 태그를 추가할 수 있습니다.
            // 예: <img src="${appState.currentDeck.deckInfo.imagePath}${card.image}" alt="${card.name}">

            container.appendChild(positionEl);
            container.appendChild(cardEl);
            resultCardsContainer.appendChild(container);
        });
        
        showScreen('result');
    }
    
    // 프로그램 초기화/재시작 함수
    function resetApp() {
        appState.currentDeck = null;
        appState.currentSpread = null;
        appState.shuffledDeck = [];
        appState.drawnCards = [];
        appState.cardsToDraw = 0;
        showScreen('deckSelection');
    }


    // --- 3. 이벤트 핸들러 ---

    // 덱 선택 처리
    deckList.addEventListener('click', async (e) => {
        const selectedDeckDiv = e.target.closest('.deck-card');
        if (!selectedDeckDiv) return;

        const deckId = selectedDeckDiv.dataset.deckId;
        const success = await loadDeck(deckId);
        if (success) {
            showScreen('spreadSelection');
        }
    });

    // 스프레드 선택 처리
    spreadList.addEventListener('click', (e) => {
        const selectedSpreadButton = e.target.closest('.spread-button');
        if (!selectedSpreadButton) return;
        
        const spreadType = selectedSpreadButton.dataset.spreadType;
        
        if (spreadType === 'custom') {
            // 커스텀 스프레드 로직 (간단한 prompt 사용)
            const numCards = parseInt(prompt("몇 장의 카드를 뽑으시겠습니까?", "3"));
            if (isNaN(numCards) || numCards <= 0) {
                alert("유효한 숫자를 입력하세요.");
                return;
            }
            let positions = [];
            for (let i = 0; i < numCards; i++) {
                const pos = prompt(`${i + 1}번째 카드의 의미는 무엇입니까?`, `위치 ${i+1}`);
                positions.push(pos || `위치 ${i+1}`); // 입력이 없으면 기본값 사용
            }
            appState.currentSpread = { name: '커스텀 스프레드', cards_to_draw: numCards, positions: positions };
        } else {
            appState.currentSpread = SPREADS[spreadType];
        }
        
        appState.cardsToDraw = appState.currentSpread.cards_to_draw;
        
        // 카드 섞기
        shuffleDeck(appState.currentDeck.cards);
        
        // 카드 뽑기 화면으로 이동 및 설정
        setupCardDrawingScreen();
        showScreen('cardDrawing');
    });
    
    // 카드 선택 처리
    function handleCardSelection(e) {
        // 이미 선택된 카드는 스타일을 변경하여 피드백 제공
        e.target.style.backgroundColor = 'var(--primary-color)';
        e.target.style.transform = 'translateY(-10px)';
        e.target.style.cursor = 'default';
        
        // 섞인 덱에서 맨 위 카드를 하나 뽑아 저장
        const drawnCard = appState.shuffledDeck.pop();
        appState.drawnCards.push(drawnCard);
        
        appState.cardsToDraw--;
        drawInstruction.innerHTML = `아래 카드 중에서 <strong>${appState.cardsToDraw}장</strong>을 더 선택하세요.`;

        if (appState.cardsToDraw === 0) {
            console.log("선택 완료:", appState.drawnCards);
            // 모든 카드를 선택했으면 결과 표시
            setTimeout(() => {
                renderResults();
            }, 500); // 잠시 후 결과 화면으로 전환
        }
    }
    
    // 다시 시작 버튼
    restartButton.addEventListener('click', resetApp);
    
    // --- 4. 초기화 ---
    resetApp(); // 앱 시작 시 초기 상태로 설정
});