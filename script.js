/* ==============================================
   TaskFlow - Modern Trello Clone
   Interactive Features & Drag-and-Drop
   ============================================== */

// ==============================================
// State Management
// ==============================================

const state = {
    boards: [],
    currentBoard: null,
    draggedCard: null,
    draggedOverCard: null
};

// ==============================================
// Drag and Drop Functionality
// ==============================================

function initDragAndDrop() {
    const cards = document.querySelectorAll('.card');
    const lists = document.querySelectorAll('.cards-container');

    // Setup card dragging
    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', handleCardDragOver);
        card.addEventListener('drop', handleCardDrop);
        card.addEventListener('dragleave', handleCardDragLeave);
    });

    // Setup list drop zones
    lists.forEach(list => {
        list.addEventListener('dragover', handleListDragOver);
        list.addEventListener('drop', handleListDrop);
        list.addEventListener('dragleave', handleListDragLeave);
    });
}

function handleDragStart(e) {
    state.draggedCard = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);

    // Add visual feedback
    setTimeout(() => {
        this.style.opacity = '0.5';
    }, 0);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    this.style.opacity = '1';

    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });

    state.draggedCard = null;
}

function handleCardDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';

    if (this !== state.draggedCard) {
        this.classList.add('drag-over');
    }

    return false;
}

function handleCardDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (state.draggedCard !== this) {
        // Insert dragged card before this card
        const container = this.parentElement;
        container.insertBefore(state.draggedCard, this);

        // Animation
        animateCardDrop(state.draggedCard);
    }

    this.classList.remove('drag-over');
    return false;
}

function handleCardDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleListDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';
    this.parentElement.classList.add('drag-over');

    return false;
}

function handleListDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    // Append to list if dropped on empty area
    if (state.draggedCard && e.target.classList.contains('cards-container')) {
        this.appendChild(state.draggedCard);
        animateCardDrop(state.draggedCard);
    }

    this.parentElement.classList.remove('drag-over');
    updateCardCount(this.parentElement);

    return false;
}

function handleListDragLeave(e) {
    if (e.target.classList.contains('cards-container')) {
        this.parentElement.classList.remove('drag-over');
    }
}

function animateCardDrop(card) {
    card.style.animation = 'none';
    setTimeout(() => {
        card.style.animation = 'fadeIn 0.3s ease-out';
    }, 10);
}

// ==============================================
// Card Management
// ==============================================

function createNewCard(container, title = 'Nova Tarefa') {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;

    card.innerHTML = `
        <h4 class="card-title">${title}</h4>
        <div class="card-footer">
            <div class="card-meta">
                <span class="meta-item">📋 Novo</span>
            </div>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}" alt="Assigned" class="card-avatar">
        </div>
    `;

    // Add drag listeners
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleCardDragOver);
    card.addEventListener('drop', handleCardDrop);
    card.addEventListener('dragleave', handleCardDragLeave);

    // Add click listener for editing
    card.addEventListener('click', () => openCardModal(card));

    return card;
}

function openCardModal(card) {
    // Create a simple inline editor for demo purposes
    const title = card.querySelector('.card-title');
    const currentText = title.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.cssText = `
        width: 100%;
        padding: 8px;
        background: rgba(0,0,0,0.3);
        border: 2px solid #6366f1;
        border-radius: 6px;
        color: white;
        font-size: 15px;
        font-weight: 600;
    `;

    title.replaceWith(input);
    input.focus();
    input.select();

    const saveEdit = () => {
        const newTitle = input.value.trim() || currentText;
        const newTitleElement = document.createElement('h4');
        newTitleElement.className = 'card-title';
        newTitleElement.textContent = newTitle;
        input.replaceWith(newTitleElement);
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        }
    });
}

// ==============================================
// List Management
// ==============================================

function updateCardCount(list) {
    const countElement = list.querySelector('.card-count');
    const cardsContainer = list.querySelector('.cards-container');
    const cardCount = cardsContainer.querySelectorAll('.card').length;

    if (countElement) {
        countElement.textContent = cardCount;
    }
}

function createNewList(title = 'Nova Lista') {
    const boardContainer = document.querySelector('.board-container');
    const addListElement = document.querySelector('.list-add');

    const list = document.createElement('div');
    list.className = 'list';
    list.dataset.listId = Date.now();

    list.innerHTML = `
        <div class="list-header">
            <h3 class="list-title">📌 ${title}</h3>
            <div class="list-actions">
                <span class="card-count">0</span>
                <button class="btn-icon-small">⋯</button>
            </div>
        </div>

        <div class="cards-container"></div>

        <button class="add-card-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Adicionar cartão
        </button>
    `;

    // Insert before "add list" button
    boardContainer.insertBefore(list, addListElement);

    // Setup listeners
    setupListListeners(list);

    // Animation
    list.style.animation = 'slideIn 0.3s ease-out';

    return list;
}

function setupListListeners(list) {
    const addCardBtn = list.querySelector('.add-card-btn');
    const cardsContainer = list.querySelector('.cards-container');
    const listTitle = list.querySelector('.list-title');

    // Add card button
    addCardBtn.addEventListener('click', () => {
        const cardTitle = prompt('Nome do cartão:');
        if (cardTitle && cardTitle.trim()) {
            const card = createNewCard(cardsContainer, cardTitle.trim());
            cardsContainer.appendChild(card);
            updateCardCount(list);

            // Animate
            card.style.animation = 'fadeIn 0.3s ease-out';
        }
    });

    // Edit list title
    listTitle.addEventListener('dblclick', () => {
        const currentText = listTitle.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.style.cssText = `
            width: 100%;
            padding: 4px 8px;
            background: rgba(0,0,0,0.3);
            border: 2px solid #6366f1;
            border-radius: 6px;
            color: white;
            font-size: 16px;
            font-weight: 700;
        `;

        listTitle.replaceWith(input);
        input.focus();
        input.select();

        const saveEdit = () => {
            const newText = input.value.trim() || currentText;
            const newTitle = document.createElement('h3');
            newTitle.className = 'list-title';
            newTitle.textContent = newText;
            newTitle.addEventListener('dblclick', arguments.callee);
            input.replaceWith(newTitle);
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveEdit();
        });
    });

    // Setup drag and drop
    cardsContainer.addEventListener('dragover', handleListDragOver);
    cardsContainer.addEventListener('drop', handleListDrop);
    cardsContainer.addEventListener('dragleave', handleListDragLeave);
}

// ==============================================
// Event Listeners Setup
// ==============================================

function setupEventListeners() {
    // Add card buttons
    document.querySelectorAll('.add-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const list = e.target.closest('.list');
            const cardsContainer = list.querySelector('.cards-container');

            const cardTitle = prompt('Nome do cartão:');
            if (cardTitle && cardTitle.trim()) {
                const card = createNewCard(cardsContainer, cardTitle.trim());
                cardsContainer.appendChild(card);
                updateCardCount(list);
            }
        });
    });

    // Add list button
    const addListBtns = document.querySelectorAll('.add-list-btn, .btn-primary');
    addListBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const listTitle = prompt('Nome da lista:');
            if (listTitle && listTitle.trim()) {
                createNewList(listTitle.trim());
            }
        });
    });

    // Card click to edit
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => openCardModal(card));
    });

    // Edit list titles on double click
    document.querySelectorAll('.list-title').forEach(title => {
        title.addEventListener('dblclick', function() {
            const currentText = this.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentText;
            input.style.cssText = `
                width: 100%;
                padding: 4px 8px;
                background: rgba(0,0,0,0.3);
                border: 2px solid #6366f1;
                border-radius: 6px;
                color: white;
                font-size: 16px;
                font-weight: 700;
            `;

            this.replaceWith(input);
            input.focus();
            input.select();

            const saveEdit = () => {
                const newText = input.value.trim() || currentText;
                const newTitle = document.createElement('h3');
                newTitle.className = 'list-title';
                newTitle.textContent = newText;
                newTitle.addEventListener('dblclick', arguments.callee);
                input.replaceWith(newTitle);
            };

            input.addEventListener('blur', saveEdit);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') saveEdit();
            });
        });
    });

    // Search functionality
    const searchBtn = document.querySelector('.btn-icon[title="Buscar"]');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const searchTerm = prompt('Buscar cartões:');
            if (searchTerm) {
                highlightSearchResults(searchTerm);
            }
        });
    }
}

function highlightSearchResults(term) {
    const cards = document.querySelectorAll('.card');
    const lowerTerm = term.toLowerCase();

    cards.forEach(card => {
        const title = card.querySelector('.card-title');
        const description = card.querySelector('.card-description');
        const text = (title?.textContent || '') + ' ' + (description?.textContent || '');

        if (text.toLowerCase().includes(lowerTerm)) {
            card.style.outline = '3px solid #6366f1';
            card.style.outlineOffset = '2px';
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            card.style.outline = 'none';
        }
    });

    // Clear highlights after 3 seconds
    setTimeout(() => {
        cards.forEach(card => {
            card.style.outline = 'none';
        });
    }, 3000);
}

// ==============================================
// Keyboard Shortcuts
// ==============================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K: Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchTerm = prompt('Buscar cartões:');
            if (searchTerm) {
                highlightSearchResults(searchTerm);
            }
        }

        // Ctrl/Cmd + N: New card in first list
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            const firstList = document.querySelector('.list');
            if (firstList) {
                const cardsContainer = firstList.querySelector('.cards-container');
                const cardTitle = prompt('Nome do cartão:');
                if (cardTitle && cardTitle.trim()) {
                    const card = createNewCard(cardsContainer, cardTitle.trim());
                    cardsContainer.appendChild(card);
                    updateCardCount(firstList);
                }
            }
        }

        // Ctrl/Cmd + L: New list
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            const listTitle = prompt('Nome da lista:');
            if (listTitle && listTitle.trim()) {
                createNewList(listTitle.trim());
            }
        }
    });
}

// ==============================================
// Animations and Effects
// ==============================================

function addHoverEffects() {
    // Add shimmer effect to primary button
    const primaryBtns = document.querySelectorAll('.btn-primary');
    primaryBtns.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });

        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Add pulse effect to notifications badge
    const badge = document.querySelector('.badge');
    if (badge) {
        setInterval(() => {
            badge.style.animation = 'none';
            setTimeout(() => {
                badge.style.animation = 'pulse 2s ease-in-out infinite';
            }, 10);
        }, 3000);
    }
}

// Add pulse animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.1);
            opacity: 0.8;
        }
    }
`;
document.head.appendChild(style);

// ==============================================
// Local Storage
// ==============================================

function saveToLocalStorage() {
    const boardData = {
        lists: []
    };

    document.querySelectorAll('.list').forEach(list => {
        if (list.classList.contains('list-add')) return;

        const listData = {
            id: list.dataset.listId,
            title: list.querySelector('.list-title').textContent,
            cards: []
        };

        list.querySelectorAll('.card').forEach(card => {
            const cardData = {
                title: card.querySelector('.card-title').textContent,
                html: card.innerHTML
            };
            listData.cards.push(cardData);
        });

        boardData.lists.push(listData);
    });

    localStorage.setItem('taskflow-board', JSON.stringify(boardData));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('taskflow-board');
    if (!saved) return;

    // For demo purposes, we'll skip auto-loading to show the mockup
    // Uncomment to enable persistence:
    // const boardData = JSON.parse(saved);
    // ... restore board from data
}

// ==============================================
// Initialize
// ==============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 TaskFlow initialized!');

    // Initialize all features
    initDragAndDrop();
    setupEventListeners();
    setupKeyboardShortcuts();
    addHoverEffects();
    loadFromLocalStorage();

    // Auto-save every 5 seconds
    setInterval(saveToLocalStorage, 5000);

    // Setup existing lists
    document.querySelectorAll('.list').forEach(list => {
        if (!list.classList.contains('list-add')) {
            setupListListeners(list);
        }
    });

    console.log('💡 Dicas:');
    console.log('- Arraste cartões entre listas');
    console.log('- Clique em um cartão para editar');
    console.log('- Clique duplo no título da lista para editar');
    console.log('- Ctrl+K: Buscar');
    console.log('- Ctrl+N: Novo cartão');
    console.log('- Ctrl+L: Nova lista');
});

// ==============================================
// Export for external use
// ==============================================

window.TaskFlow = {
    createCard: createNewCard,
    createList: createNewList,
    save: saveToLocalStorage,
    load: loadFromLocalStorage
};
