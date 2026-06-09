(function() {
    'use strict';

    const CONFIG = {
        API_KEYS: window.MY_GROQ_KEYS || ["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"],
        CURRENT_KEY_INDEX: 0,
        MODEL: "llama-3.3-70b-versatile",
        API_URL: "https://api.groq.com/openai/v1/chat/completions",
        PANEL_ID: 'mdw-floating-panel',
        PRIMARY_COLOR: '#ffffff', 
        ACCENT_COLOR: '#000000',
        ERROR_COLOR: '#070606',
        BG_COLOR: '#ffffff',
        BORDER_STYLE: '2px solid #000000'
    };

    const logger = {
        info: (msg) => console.log(`%c[MDW INFO] %c${msg}`, "color:#000;font-weight:bold", "color:#333"),
        error: (msg) => console.error(`%c[MDW ERROR] %c${msg}`, "color:#000000;font-weight:bold", "color:black")
    };

    function showMDWAlert(msg, isError = true) {
        const existing = document.getElementById('mdw-custom-alert');
        if (existing) existing.remove();

        const alertBox = document.createElement('div');
        alertBox.id = 'mdw-custom-alert';
        Object.assign(alertBox.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: '1000000', padding: '25px', width: '300px',
            background: '#fff',
            border: `3px solid ${isError ? CONFIG.ERROR_COLOR : '#000'}`,
            borderRadius: '20px',
            boxShadow: `10px 10px 0px ${isError ? 'rgba(19,16,16,0.2)' : '#000'}`,
            textAlign: 'center', color: '#000', fontFamily: '"Plus Jakarta Sans", sans-serif',
            animation: 'mdwPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        });

        const title = document.createElement('div');
        title.innerText = isError ? "SYSTEM ERROR" : "SECURITY NOTIF";
        Object.assign(title.style, {
            color: isError ? CONFIG.ERROR_COLOR : '#000',
            fontWeight: '800', marginBottom: '10px', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase'
        });

        const content = document.createElement('div');
        content.innerText = msg;
        Object.assign(content.style, { fontSize: '12px', marginBottom: '20px', fontWeight: '600', opacity: '0.7' });

        const btn = document.createElement('button');
        btn.innerText = "CONFIRM";
        Object.assign(btn.style, {
            width: '100%', padding: '10px', background: '#000',
            border: 'none', borderRadius: '10px', cursor: 'pointer',
            fontWeight: '800', color: '#fff', fontSize: '11px', transition: '0.2s'
        });

        btn.onclick = () => alertBox.remove();
        alertBox.appendChild(title);
        alertBox.appendChild(content);
        alertBox.appendChild(btn);
        document.body.appendChild(alertBox);

        if (!document.getElementById('mdw-style-anim')) {
            const style = document.createElement('style');
            style.id = 'mdw-style-anim';
            style.innerHTML = `@keyframes mdwPop { from { transform: translate(-50%, -45%) scale(0.9); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }`;
            document.head.appendChild(style);
        }
        setTimeout(() => { if(alertBox.parentNode) alertBox.remove(); }, 5000);
    }

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
            showMDWAlert("SOAL TIDAK TERDETEKSI!");
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
            const aiNorm = normalize(aiAnswer);
            const optNorm = normalize(opt.text);
            if (aiNorm.includes(optNorm) || optNorm.includes(aiNorm)) {
                opt.element.style.outline = `4px solid #000`;
                opt.element.style.borderRadius = "12px";
                opt.element.click();
                found = true;
            }
        });

        if (!found) {
            showMDWAlert("OPSI TIDAK COCOK!");
        }
        resetButton();
    }

    function resetButton() {
        const btn = document.getElementById('ai-solver-button');
        if (btn) {
            btn.innerText = "MULAI";
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
        panel.style.display = 'block';
        panel.style.opacity = isVisible ? '1' : '0';
        panel.style.transform = isVisible ? 'translateY(0)' : 'translateY(20px)';
        panel.style.pointerEvents = isVisible ? 'auto' : 'none';

        if (!isVisible) {
            setTimeout(() => {
                if (panel.dataset.visible === 'false') {
                    panel.style.display = 'none';
                }
            }, 300);
        }
    }

    function toggleUI() {
        const panel = getPanel();
        if (!panel) {
            createUI();
            return;
        }

        setPanelVisible(panel.dataset.visible === 'false' || panel.style.display === 'none');
    }

    function setupShortcuts() {
        if (window.__mdwGroqShortcutsReady) return;
        window.__mdwGroqShortcutsReady = true;

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

    function createUI() {
        if (document.getElementById(CONFIG.PANEL_ID)) return;

        const panel = document.createElement('div');
        panel.id = CONFIG.PANEL_ID;
        panel.dataset.visible = 'true';
        Object.assign(panel.style, {
            position: 'fixed', bottom: '30px', right: '30px', zIndex: '999999',
            width: '160px', padding: '15px',
            background: '#fff',
            border: '2.5px solid #000', borderRadius: '20px',
            boxShadow: '8px 8px 0px #000',
            fontFamily: '"Plus Jakarta Sans", sans-serif', textAlign: 'center',
            transition: '0.3s ease',
            display: 'block',
            opacity: '1',
            pointerEvents: 'auto'
        });

        const closeBtn = document.createElement('div');
        closeBtn.innerText = 'Ã—';
        Object.assign(closeBtn.style, {
            position: 'absolute', top: '5px', right: '12px',
            color: '#000', fontSize: '20px', fontWeight: '800',
            cursor: 'pointer', opacity: '0.4'
        });
        
        closeBtn.onclick = () => setPanelVisible(false);
        panel.appendChild(closeBtn);

        const brand = document.createElement('div');
        brand.innerText = "WAYGROUND AI";
        Object.assign(brand.style, {
            fontSize: '9px', color: '#000', letterSpacing: '2px',
            marginBottom: '12px', fontWeight: '800', opacity: '0.5'
        });
        panel.appendChild(brand);

        const mainBtn = document.createElement('button');
        mainBtn.id = 'ai-solver-button';
        mainBtn.innerText = 'MULAI';
        Object.assign(mainBtn.style, {
            width: '100%', padding: '12px', 
            background: '#000',
            color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer',
            fontWeight: '800', fontSize: '11px', marginBottom: '12px',
            textTransform: 'uppercase'
        });
        mainBtn.onclick = executeBypass;
        panel.appendChild(mainBtn);

        const footer = document.createElement('div');
        footer.innerHTML = 'MDW LAB';
        Object.assign(footer.style, {
            fontSize: '8px', color: '#000', fontWeight: '800',
            letterSpacing: '1px', opacity: '0.3',
            borderTop: '1px dashed #ccc', paddingTop: '8px'
        });
        panel.appendChild(footer);

        document.body.appendChild(panel);
    }

    function initTriggerListener() {
        document.addEventListener('click', function(e) {
            const trigger = e.target.closest('.icon-far-bars') || e.target.closest('.flex.visible.justify-center.items-center');
            if (trigger) {
                const panel = document.getElementById(CONFIG.PANEL_ID);
                if (panel && panel.style.display === 'none') {
                    setPanelVisible(true);
                }
            }
        });
    }

    setupShortcuts();
    setTimeout(() => {
        createUI();
        initTriggerListener();
    }, 1000);
    
})();
