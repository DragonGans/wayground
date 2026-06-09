(function() {
    'use strict';

    const CONFIG = {
     API_KEYS: window.MY_GROQ_KEYS || ["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"],
        CURRENT_KEY_INDEX: 0,
        MODEL: "llama-3.3-70b-versatile",
        API_URL: "https://api.groq.com/openai/v1/chat/completions",
        PANEL_ID: 'mdw-floating-panel',
        PRIMARY_COLOR: '#00f2fe',
        ERROR_COLOR: '#ff4d4d',
        BG_GRADIENT: 'linear-gradient(145deg, #050a18 0%, #00122e 100%)'
    };

    const logger = {
        info: (msg) => console.log(`%c[MDW INFO] %c${msg}`, "color:#00f2fe;font-weight:bold", "color:white"),
        error: (msg) => console.error(`%c[MDW ERROR] %c${msg}`, "color:#ff4d4d;font-weight:bold", "color:white")
    };

    function showMDWAlert(msg, isError = true) {
        const existing = document.getElementById('mdw-custom-alert');
        if (existing) existing.remove();

        const alertBox = document.createElement('div');
        alertBox.id = 'mdw-custom-alert';
        Object.assign(alertBox.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: '1000000', padding: '30px', width: '320px',
            background: CONFIG.BG_GRADIENT,
            border: `2px solid ${isError ? CONFIG.ERROR_COLOR : CONFIG.PRIMARY_COLOR}`,
            borderRadius: '24px',
            boxShadow: `0 0 50px ${isError ? 'rgba(255, 77, 77, 0.5)' : 'rgba(0, 242, 254, 0.5)'}`,
            textAlign: 'center', color: '#fff', fontFamily: '"Segoe UI", Roboto, sans-serif',
            animation: 'mdwPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        });

        const title = document.createElement('div');
        title.innerText = isError ? "NOTIF SYSTEMï¸" :"KEAMANAN SYSTEM";
        Object.assign(title.style, {
            color: isError ? CONFIG.ERROR_COLOR : CONFIG.PRIMARY_COLOR,
            fontWeight: '900', marginBottom: '15px', fontSize: '18px', letterSpacing: '3px'
        });

        const content = document.createElement('div');
        content.innerText = msg;
        Object.assign(content.style, { fontSize: '14px', marginBottom: '25px', lineHeight: '1.6', opacity: '0.8' });

        const btn = document.createElement('button');
        btn.innerText = "MENGERTI!";
        Object.assign(btn.style, {
            padding: '12px 30px', background: isError ? CONFIG.ERROR_COLOR : CONFIG.PRIMARY_COLOR,
            border: 'none', borderRadius: '12px', cursor: 'pointer',
            fontWeight: '900', color: '#000', fontSize: '12px', transition: '0.3s'
        });

        btn.onclick = () => alertBox.remove();
        alertBox.appendChild(title);
        alertBox.appendChild(content);
        alertBox.appendChild(btn);
        document.body.appendChild(alertBox);

        if (!document.getElementById('mdw-style-anim')) {
            const style = document.createElement('style');
            style.id = 'mdw-style-anim';
            style.innerHTML = `@keyframes mdwPop { from { transform: translate(-50%, -45%) scale(0.8); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }`;
            document.head.appendChild(style);
        }
        setTimeout(() => { if(alertBox.parentNode) alertBox.remove(); }, 7000);
    }

    /**
     * --- DEEP SCAN SELECTOR (ANTI-ERROR) ---
     */
    async function extractQuizData() {
        try {
            const selectors = ['#questionText .question-text-color', '.question-text-color', '.text-container', 'h1', 'h2'];
            let questionText = "No Text Found";
            for (let s of selectors) {
                const el = document.querySelector(s);
                if (el && el.innerText.trim().length > 2) {
                    questionText = el.innerText.trim();
                    break;
                }
            }

            const optionSelectors = ['.option.is-selectable', '.answer-option', 'div[role="radio"]', '.selectable-item'];
            let options = [];
            for (let s of optionSelectors) {
                const els = document.querySelectorAll(s);
                if (els.length > 0) {
                    options = Array.from(els).map(el => ({
                        text: el.querySelector('annotation[encoding="application/x-tex"]')?.textContent.trim() || 
                              el.querySelector('#optionText')?.innerText.trim() || 
                              el.innerText.trim(),
                        element: el
                    })).filter(o => o.text.length > 0);
                    if (options.length > 0) break;
                }
            }
            return (options.length > 0) ? { questionText, options } : null;
        } catch (e) {
            logger.error("Gagal extract data: " + e.message);
            return null;
        }
    }

    /**
     * --- AI ENGINE CORE ---
     */
    async function fetchAIAnswer(data) {
        const key = CONFIG.API_KEYS[CONFIG.CURRENT_KEY_INDEX];
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model: CONFIG.MODEL,
                    messages: [
                        { role: "system", content: "Jawab HANYA dengan teks jawaban yang paling mendekati salah satu opsi." },
                        { role: "user", content: `SOAL: ${data.questionText}\nOPSI:\n${data.options.map(o => o.text).join('\n')}\nJAWABAN:` }
                    ],
                    temperature: 0.1
                })
            });

            const result = await response.json();
            if (result.error) {
                if (result.error.code === "rate_limit_exceeded") {
                    CONFIG.CURRENT_KEY_INDEX = (CONFIG.CURRENT_KEY_INDEX + 1) % CONFIG.API_KEYS.length;
                    return fetchAIAnswer(data);
                }
                throw new Error(result.error.message);
            }
            return result.choices[0].message.content.trim();
        } catch (err) {
            logger.error("AI Error: " + err.message);
            return null;
        }
    }

    /**
     * --- AUTO ACTION ENGINE ---
     */
    async function executeBypass() {
        let btn = document.getElementById('ai-solver-button');
        if (!btn) {
            createUI();
            btn = document.getElementById('ai-solver-button');
        }
        if (!btn || btn.disabled) return;

        btn.innerText = "THINKING...";
        btn.disabled = true;

        const quizData = await extractQuizData();
        if (!quizData) {
            showMDWAlert("SOAL TIDAK TERDETEKSI! COBA REFRESH!");
            resetButton();
            return;
        }

        const aiAnswer = await fetchAIAnswer(quizData);
        if (!aiAnswer) {
            showMDWAlert("AI GAGAL MEMBERIKAN JAWABAN!");
            resetButton();
            return;
        }

        const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        let found = false;

        quizData.options.forEach(opt => {
            if (normalize(aiAnswer).includes(normalize(opt.text)) || normalize(opt.text).includes(normalize(aiAnswer))) {
                opt.element.style.outline = `4px solid ${CONFIG.PRIMARY_COLOR}`;
                opt.element.click();
                found = true;
            }
        });

        if (found) {
    
        } else {
            showMDWAlert("JAWABAN AI TIDAK COCOK DENGAN OPSI!");
        }
        resetButton();
    }

    function resetButton() {
        const btn = document.getElementById('ai-solver-button');
        if (btn) {
            btn.innerText = "Mulai";
            btn.disabled = false;
        }
    }

    function getPanel() {
        return document.getElementById(CONFIG.PANEL_ID);
    }

    function setPanelVisible(isVisible) {
        const panel = getPanel();
        if (!panel) {
            if (isVisible) createUI();
            return;
        }

        panel.dataset.visible = isVisible ? 'true' : 'false';
        panel.style.transform = isVisible ? 'translateX(0)' : 'translateX(300px)';
        panel.style.opacity = isVisible ? '1' : '0';
        panel.style.pointerEvents = isVisible ? 'auto' : 'none';
    }

    function toggleUI() {
        const panel = getPanel();
        if (!panel) {
            createUI();
            return;
        }

        setPanelVisible(panel.dataset.visible === 'false');
    }

    function setupShortcuts() {
        if (window.__mdwShortcutsReady) return;
        window.__mdwShortcutsReady = true;

        document.addEventListener('keydown', (event) => {
            if (!event.altKey || !event.shiftKey || event.repeat) return;

            const key = event.key.toLowerCase();
            if (key === 'd' || event.code === 'KeyD') {
                event.preventDefault();
                toggleUI();
            }

            if (key === 's' || event.code === 'KeyS') {
                event.preventDefault();
                executeBypass();
            }
        }, true);
    }

    /**
     * --- UI CONSTRUCTION (200+ LINES GUARANTEED) ---
     */
    function createUI() {
        if (document.getElementById(CONFIG.PANEL_ID)) return;

        const panel = document.createElement('div');
        panel.id = CONFIG.PANEL_ID;
        panel.dataset.visible = 'true';
        Object.assign(panel.style, {
            position: 'fixed', bottom: '30px', right: '30px', zIndex: '999999',
            width: '180px', padding: '20px 15px 12px 15px',
            background: CONFIG.BG_GRADIENT,
            border: `2px solid ${CONFIG.PRIMARY_COLOR}`, borderRadius: '22px',
            boxShadow: `0 10px 30px rgba(0, 242, 254, 0.3)`,
            fontFamily: '"Segoe UI", sans-serif', textAlign: 'center',
            opacity: '1', pointerEvents: 'auto',
            transition: '0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        });

        const closeBtn = document.createElement('div');
        closeBtn.innerText = 'Ã—';
        Object.assign(closeBtn.style, {
            position: 'absolute', top: '8px', right: '12px',
            color: CONFIG.ERROR_COLOR, fontSize: '24px', fontWeight: 'bold',
            cursor: 'pointer', lineHeight: '1', transition: '0.2s'
        });
        closeBtn.onmouseover = () => closeBtn.style.transform = 'scale(1.2)';
        closeBtn.onmouseout = () => closeBtn.style.transform = 'scale(1)';
        closeBtn.onclick = () => setPanelVisible(false);
        panel.appendChild(closeBtn);

        const brand = document.createElement('div');
        brand.innerText = "Wayground";
        Object.assign(brand.style, {
            fontSize: '10px', color: CONFIG.PRIMARY_COLOR, letterSpacing: '3px',
            marginBottom: '15px', fontWeight: '900', opacity: '0.9'
        });
        panel.appendChild(brand);

        const mainBtn = document.createElement('button');
        mainBtn.id = 'ai-solver-button';
        mainBtn.innerText = 'Mulai';
        Object.assign(mainBtn.style, {
            width: '100%', padding: '12px', 
            background: `linear-gradient(90deg, #4facfe 0%, ${CONFIG.PRIMARY_COLOR} 100%)`,
            color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer',
            fontWeight: '900', fontSize: '13px', marginBottom: '15px'
        });
        mainBtn.onclick = executeBypass;
        panel.appendChild(mainBtn);

        const footer = document.createElement('div');
        footer.innerHTML = 'MDW OFFICIAL';
        Object.assign(footer.style, {
            fontSize: '8px', color: '#4facfe', fontWeight: 'bold',
            letterSpacing: '1px', borderTop: '1px solid rgba(0, 242, 254, 0.1)',
            paddingTop: '10px', lineHeight: '1.4'
        });
        panel.appendChild(footer);

        document.body.appendChild(panel);
        logger.info("UI Loaded Successfully!");
    }

    setupShortcuts();
    setTimeout(createUI, 2000);
})();
