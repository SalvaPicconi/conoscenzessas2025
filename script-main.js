const TAB_STORAGE_KEY = 'cv-active-tab';
let resizeObservers = new Map();

document.addEventListener('DOMContentLoaded', () => {
    const tabNavigation = document.querySelector('.tab-navigation');
    const tabButtons = [...document.querySelectorAll('.tab-button')];
    const tabPanels = [...document.querySelectorAll('.tab-content')];
    const iframes = [...document.querySelectorAll('.content-iframe')];

    if (!tabNavigation || tabButtons.length === 0 || tabPanels.length === 0) {
        return;
    }

    tabNavigation.setAttribute('role', 'tablist');
    tabButtons.forEach(button => {
        const tabId = button.dataset.tab;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', `content-${tabId}`);
        button.setAttribute('tabindex', '-1');
    });
    tabPanels.forEach(panel => {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('tabindex', '-1');
        panel.setAttribute('aria-hidden', 'true');
    });

    const storedTab = localStorage.getItem(TAB_STORAGE_KEY);
    const initialTab = storedTab && tabButtons.some(btn => btn.dataset.tab === storedTab)
        ? storedTab
        : tabButtons[0].dataset.tab;

    setActiveTab(initialTab, { tabButtons, tabPanels, persist: false, focusButton: false });

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            setActiveTab(button.dataset.tab, { tabButtons, tabPanels, focusButton: false });
        });
    });

    tabNavigation.addEventListener('keydown', event => {
        const currentIndex = tabButtons.findIndex(btn => btn.classList.contains('active'));
        if (currentIndex === -1) {
            return;
        }
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown': {
                event.preventDefault();
                const nextIndex = (currentIndex + 1) % tabButtons.length;
                setActiveTab(tabButtons[nextIndex].dataset.tab, { tabButtons, tabPanels, focusButton: true });
                break;
            }
            case 'ArrowLeft':
            case 'ArrowUp': {
                event.preventDefault();
                const prevIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
                setActiveTab(tabButtons[prevIndex].dataset.tab, { tabButtons, tabPanels, focusButton: true });
                break;
            }
            case 'Home': {
                event.preventDefault();
                setActiveTab(tabButtons[0].dataset.tab, { tabButtons, tabPanels, focusButton: true });
                break;
            }
            case 'End': {
                event.preventDefault();
                setActiveTab(tabButtons[tabButtons.length - 1].dataset.tab, { tabButtons, tabPanels, focusButton: true });
                break;
            }
            default:
                break;
        }
    });

    iframes.forEach(iframe => {
        iframe.addEventListener('load', () => {
            adjustIframeHeight(iframe);
            observeIframeContent(iframe);
        });
    });

    const debouncedResize = debounce(() => {
        iframes.forEach(iframe => adjustIframeHeight(iframe));
    }, 150);
    window.addEventListener('resize', debouncedResize);

    window.addEventListener('message', event => {
        if (!event?.data || event.data.type !== 'iframeContentHeight') {
            return;
        }
        const targetIframe = iframes.find(frame => frame.contentWindow === event.source);
        if (targetIframe) {
            const nextHeight = Number(event.data.height);
            if (!Number.isNaN(nextHeight)) {
                targetIframe.style.height = `${Math.max(nextHeight, 720)}px`;
            }
        }
    });
});

function setActiveTab(targetId, { tabButtons, tabPanels, persist = true, focusButton = false } = {}) {
    tabButtons.forEach(button => {
        const isActive = button.dataset.tab === targetId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        button.setAttribute('tabindex', isActive ? '0' : '-1');
        if (isActive && focusButton) {
            button.focus({ preventScroll: true });
        }
    });

    tabPanels.forEach(panel => {
        const isActive = panel.id === `content-${targetId}`;
        panel.classList.toggle('active', isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    if (persist) {
        localStorage.setItem(TAB_STORAGE_KEY, targetId);
    }

    const activePanel = tabPanels.find(panel => panel.id === `content-${targetId}`);
    const iframe = activePanel ? activePanel.querySelector('.content-iframe') : null;
    if (iframe) {
        adjustIframeHeight(iframe);
    }
}

function adjustIframeHeight(iframe) {
    try {
        const documentBody = iframe?.contentDocument?.body;
        if (!documentBody) {
            return;
        }
        const scrollHeight = Math.max(documentBody.scrollHeight, documentBody.offsetHeight);
        iframe.style.height = `${Math.max(scrollHeight + 48, 720)}px`;
    } catch (error) {
        console.warn('Impossibile calcolare altezza iframe:', error);
    }
}

function observeIframeContent(iframe) {
    try {
        const doc = iframe?.contentDocument;
        if (!doc) {
            return;
        }
        if (resizeObservers.has(iframe)) {
            resizeObservers.get(iframe).disconnect();
        }
        const observer = new ResizeObserver(() => adjustIframeHeight(iframe));
        observer.observe(doc.body);
        resizeObservers.set(iframe, observer);
    } catch (error) {
        console.warn('Impossibile avviare ResizeObserver per iframe:', error);
    }
}

function debounce(fn, wait) {
    let timeoutId;
    return function debounced(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), wait);
    };
}
