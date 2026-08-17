document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('scenario-form');
    const typeSelect = document.getElementById('scenario-type');
    const formatSelect = document.getElementById('comm-format');
    const keyPointsArea = document.getElementById('key-points');
    const apiKeyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('gemini-model');
    const customModelInput = document.getElementById('custom-model');
    const wordCount = document.querySelector('.word-count');
    const generateBtn = document.querySelector('.generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const speakBtn = document.getElementById('speak-btn');
    const openAiKeyInput = document.getElementById('openai-key');
    const formatGroup = document.getElementById('format-group');
    const keyPointsGroup = document.getElementById('key-points-group');
    let currentAudio = null;

    function safeGetStorage(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeSetStorage(key, value) {
        try { localStorage.setItem(key, value); } catch (e) {}
    }

    function getSelectedModel() {
        if (modelSelect && modelSelect.value === 'custom') {
            const customVal = customModelInput ? customModelInput.value.trim() : '';
            return customVal || 'gemini-3.5-flash';
        }
        return modelSelect ? modelSelect.value : 'gemini-3.5-flash';
    }

    // Restore saved settings from localStorage
    if (apiKeyInput) {
        const savedApiKey = safeGetStorage('hw_eng_gemini_key');
        if (savedApiKey) apiKeyInput.value = savedApiKey;
        apiKeyInput.addEventListener('input', () => {
            safeSetStorage('hw_eng_gemini_key', apiKeyInput.value.trim());
        });
    }

    if (openAiKeyInput) {
        const savedOpenAiKey = safeGetStorage('hw_eng_openai_key');
        if (savedOpenAiKey) openAiKeyInput.value = savedOpenAiKey;
        openAiKeyInput.addEventListener('input', () => {
            safeSetStorage('hw_eng_openai_key', openAiKeyInput.value.trim());
        });
    }

    if (modelSelect) {
        const savedModel = safeGetStorage('hw_eng_gemini_model');
        if (savedModel) {
            modelSelect.value = savedModel;
            if (savedModel === 'custom' && customModelInput) {
                customModelInput.classList.remove('hidden');
                const savedCustom = safeGetStorage('hw_eng_custom_model');
                if (savedCustom) customModelInput.value = savedCustom;
            }
        }

        modelSelect.addEventListener('change', () => {
            if (modelSelect.value === 'custom') {
                if (customModelInput) {
                    customModelInput.classList.remove('hidden');
                    customModelInput.focus();
                }
            } else {
                if (customModelInput) {
                    customModelInput.classList.add('hidden');
                }
            }
            safeSetStorage('hw_eng_gemini_model', modelSelect.value);
        });
    }

    if (customModelInput) {
        customModelInput.addEventListener('input', () => {
            safeSetStorage('hw_eng_custom_model', customModelInput.value.trim());
        });
    }
    
    // TTS Synth
    const synth = window.speechSynthesis;
    
    const outputEmpty = document.getElementById('output-empty');
    const outputResult = document.getElementById('output-result');

    // Result elements
    const resultSubject = document.getElementById('result-subject');
    const resultMessage = document.getElementById('result-message');
    const resultVocab = document.getElementById('result-vocab');
    const resultGrammar = document.getElementById('result-grammar');

    // Chat UI elements
    const outputChat = document.getElementById('output-chat');
    const chatHistory = document.getElementById('chat-history');
    const chatStatus = document.getElementById('chat-status');
    const micBtn = document.getElementById('mic-btn');
    const micBtnText = document.getElementById('mic-btn-text');
    const modeInputs = document.querySelectorAll('input[name="app-mode"]');
    const modeBadge = document.getElementById('mode-badge');
    const generateBtnTxt = document.querySelector('.btn-text');

    let currentMode = 'generator';
    let isConversing = false;
    let isRecording = false;
    
    let conversationHistory = [];
    let systemInstructionText = "";
    let finalTranscript = '';
    
    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            chatStatus.textContent = 'Listening: ' + finalTranscript + interimTranscript;
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            chatStatus.textContent = `Speech Error: ${event.error}. Try clicking again.`;
            resetMicBtn();
        };
        
        recognition.onend = () => {
            if (isRecording) {
                isRecording = false;
                micBtn.classList.remove('active');
                micBtnText.textContent = 'Push to Talk';
                if (finalTranscript.trim() !== '') {
                    handleUserVoiceInput(finalTranscript.trim());
                    finalTranscript = '';
                } else {
                    chatStatus.textContent = 'Ready for your input.';
                }
            }
        };
    } else {
        console.warn("Speech Recognition API not supported in this browser.");
    }
    
    function resetMicBtn() {
        isRecording = false;
        micBtn.classList.remove('active');
        micBtnText.textContent = 'Push to Talk';
        if (chatStatus.textContent === 'Listening...') {
             chatStatus.textContent = 'Ready for your input.';
        }
    }

    // Mode Toggle
    modeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            currentMode = e.target.value;
            if (currentMode === 'generator') {
                modeBadge.textContent = 'Generator Mode';
                generateBtnTxt.textContent = 'Generate English Example';
                outputChat.classList.add('hidden');
                
                if (formatGroup) formatGroup.classList.remove('hidden');
                if (keyPointsGroup) keyPointsGroup.classList.remove('hidden');
                formatSelect.required = true;
                keyPointsArea.required = true;
                
                if (resultSubject.textContent === '...') {
                    outputEmpty.classList.remove('hidden');
                    outputResult.classList.add('hidden');
                } else {
                    outputEmpty.classList.add('hidden');
                    outputResult.classList.remove('hidden');
                }
            } else {
                modeBadge.textContent = 'Conversation Mode';
                generateBtnTxt.textContent = 'Start Conversation Simulator';
                outputEmpty.classList.add('hidden');
                outputResult.classList.add('hidden');
                outputChat.classList.remove('hidden');
                
                if (formatGroup) formatGroup.classList.add('hidden');
                if (keyPointsGroup) keyPointsGroup.classList.add('hidden');
                formatSelect.required = false;
                keyPointsArea.required = false;
            }
        });
    });

    // Update Word Count
    keyPointsArea.addEventListener('input', (e) => {
        const text = e.target.value.trim();
        const length = text.length;
        wordCount.textContent = `${length} / 500`;
        
        if (length > 500) {
            wordCount.style.color = 'var(--error-color)';
            e.target.value = text.substring(0, 500);
            wordCount.textContent = `500 / 500`;
        } else {
            wordCount.style.color = 'var(--text-secondary)';
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = typeSelect.value;
        const format = formatSelect.value;
        const keyPoints = keyPointsArea.value;
        const tone = document.querySelector('input[name="tone"]:checked').value;
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
        
        if (currentMode === 'conversation') {
            if (!type) return;
            startConversationSimulation(type, tone);
            return;
        }

        if (!type || !format || !keyPoints) return;

        // Disable UI and show loading
        form.classList.add('loading');
        generateBtn.classList.add('loading');
        
        // Hide previous results
        outputEmpty.classList.add('hidden');
        outputResult.classList.add('hidden');
        
        if (apiKey) {
            // Real LLM API Call
            try {
                const selectedModel = getSelectedModel();
                const aiData = await generateEnglishEmail(keyPoints, tone, apiKey, format, selectedModel);
                if (aiData) {
                    resultSubject.textContent = aiData.subject;
                    resultMessage.innerHTML = aiData.body.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    
                    resultVocab.innerHTML = '';
                    if (aiData.vocab && Array.isArray(aiData.vocab)) {
                        aiData.vocab.forEach(word => {
                            const li = document.createElement('li');
                            li.textContent = word;
                            resultVocab.appendChild(li);
                        });
                    }
                    if (aiData.grammar) {
                        resultGrammar.innerHTML = aiData.grammar.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    }
                } else {
                    alert('Gemini API return invalid JSON or failed parsing. Check console.');
                }
            } catch (err) {
                alert(`API Error: ${err.message}`);
            }
            
            // Enable UI
            form.classList.remove('loading');
            generateBtn.classList.remove('loading');
            outputResult.classList.remove('hidden');
            
        } else {
            // Simulate API call and processing time (Mock)
            setTimeout(() => {
                generateMockContent(type, format, tone, keyPoints);
                
                // Enable UI
                form.classList.remove('loading');
                generateBtn.classList.remove('loading');
                
                // Show new results
                outputResult.classList.remove('hidden');
            }, 1500);
        }
    });

    async function generateEnglishEmail(keyPoints, tone, apiKey, format, model = 'gemini-3.5-flash') {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const prompt = `
            You are a highly professional Hardware Engineer.
            Your task is to translate the following bullet points/notes into a professional English ${format}.
            The format of your output should be customized for: ${format} (e.g. if it is an email, write an email. If it is a technical report, write a formal report structure. If it is internal meeting notes, write it as meeting notes).
            The user will provide notes mostly in Chinese, containing technical hardware jargon.
            Tone required: ${tone} (e.g., professional, polite, or urgent)
            
            Return ONLY a valid JSON object matching this schema precisely:
            {
                "subject": "The appropriate subject line, title, or heading based on context",
                "body": "The main content in English, formatted as a ${format}. Convert the notes into neat paragraphs and bullet points using markdown ** if needed.",
                "vocab": ["Vocab 1 (Translation)", "Vocab 2 (Translation)", "Vocab 3", "Vocab 4", "Vocab 5"],
                "grammar": "A brief, professional grammar analysis written in Traditional Chinese (繁體中文). Explain a key professional phrasing, tense, or structure used in your translation and why it is appropriate for hardware engineers."
            }
            
            User's notes:
            ${keyPoints}
        `;

        const requestBody = {
            contents: [{
                parts: [{text: prompt}]
            }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            if (data.error) {
                console.error("Gemini API Error:", data.error.message);
                throw new Error(data.error.message);
            }
            
            const jsonText = data.candidates[0].content.parts[0].text;
            return JSON.parse(jsonText);
        } catch (error) {
            console.error("Fetch API Error:", error);
            throw error;
        }
    }

    // Text-to-Speech
    speakBtn.addEventListener('click', async () => {
        if (synth.speaking) {
            synth.cancel();
            speakBtn.classList.remove('success');
            return;
        }

        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
            speakBtn.classList.remove('success');
            return;
        }

        const textToSpeak = resultMessage.textContent;
        if (!textToSpeak) return;

        const openAiKey = openAiKeyInput ? openAiKeyInput.value.trim() : '';

        if (openAiKey) {
            try {
                // Change color to indicate loading
                speakBtn.style.color = 'var(--accent-color)';
                const response = await fetch('https://api.openai.com/v1/audio/speech', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openAiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'tts-1',
                        input: textToSpeak,
                        voice: 'alloy'
                    })
                });

                if (!response.ok) {
                    throw new Error(`OpenAI HTTP ${response.status}`);
                }

                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                currentAudio = new Audio(audioUrl);
                
                currentAudio.onplay = () => {
                    speakBtn.style.color = '';
                    speakBtn.classList.add('success');
                };
                
                currentAudio.onended = () => {
                    speakBtn.classList.remove('success');
                    currentAudio = null;
                };

                currentAudio.play();
            } catch (err) {
                speakBtn.style.color = '';
                alert(`OpenAI TTS Error: ${err.message}. Falling back to default browser voice.`);
                playLocalTTS(textToSpeak);
            }
        } else {
            playLocalTTS(textToSpeak);
        }
    });

    function playLocalTTS(textToSpeak) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'en-US';

        // Attempt to find a higher quality voice (especially for Mac users)
        const voices = synth.getVoices();
        const preferredVoices = ['Samantha', 'Alex', 'Victoria', 'Daniel', 'Karen'];
        let selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Premium') || v.name.includes('Enhanced')));
        
        if (!selectedVoice) {
            for (let name of preferredVoices) {
                selectedVoice = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
                if (selectedVoice) break;
            }
        }
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith('en-US'));
        }
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
            speakBtn.classList.add('success');
        };
        utterance.onend = () => {
            speakBtn.classList.remove('success');
        };

        synth.speak(utterance);
    }

    // Copy to clipboard
    copyBtn.addEventListener('click', () => {
        const textToCopy = `Subject: ${resultSubject.textContent}\n\n${resultMessage.textContent}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Success animation
            copyBtn.classList.add('success');
            setTimeout(() => {
                copyBtn.classList.remove('success');
            }, 2000);
        });
    });

    function generateMockContent(type, format, tone, keyPoints) {
        // Detect specific user scenario based on keywords
        const isS1Scenario = keyPoints.includes('S1XXXXX6543') || keyPoints.includes('ACLR');
        const isQualcommScenario = keyPoints.includes('QPM3981') || keyPoints.includes('load-pull');
        
        let subject = '';
        let intro = '';
        let outro = '';
        let processedPoints = '';
        let vocab = [];
        let grammarText = '';

        if (isS1Scenario) {
            subject = 'Failure Analysis Report: Sample S1XXXXX6543 5G n1 ACLR Failure';
            vocab = ['ACLR (Adjacent Channel Leakage Ratio)', 'Cold solder joint / Missing solder (空焊)', 'Solder paste (錫膏)', 'Ground pad (接地Pad)', 'Stencil clogged (鋼板堵塞)'];
            
            // Professional translation customized for Hardware Eng.
            processedPoints = `- **Issue:** Sample S1XXXXX6543 failed 5G n1 ACLR testing.\n- **Root Cause:** Failure analysis revealed that the parallel capacitor (WC1732) has a cold/missing solder joint. This was caused by insufficient solder paste on the ground pad.\n- **Action Required:** Please ask the factory line to verify if the SMT stencil is clogged.`;
            
            type = 'bug-report'; // force type to bug report
            grammarText = '**"This was caused by..."**：在分析失效原因（Root Cause）時，與其使用 "The reason is..."，硬體工程師更常使用被動語態 "This was caused by..." 來傳達客觀的專業度。\n\n**"verify if..."**：用來請工廠「確認是否...」是非常典型的工程協作句型。';
        } else if (isQualcommScenario) {
            subject = 'Request: PA Load-Pull Data and MIPI Truth Table for QPM3981 (n77)';
            vocab = ['Load-pull (負載拉移)', 'Truth table (真值表)', 'MIPI (行動產業處理器介面)', 'PA (Power Amplifier)', 'FW (Firmware)'];
            
            processedPoints = `- **Data Request 1:** Please provide the comprehensive PA load-pull data for the QPM3981 module operating on Band n77.\n- **Data Request 2:** Additionally, our firmware team requires the MIPI truth table for integration. Could you please share this documentation as well?`;
            
            type = 'vendor-negotiation';
            grammarText = '**"requires... for integration"**：在這個情境中，「韌體工程師『要求』...」翻譯成 "requires" 比 "wants" 更加正式。\n\n**"Could you please share..."**：在句尾使用這個問句，是非常委婉且有禮貌的請求句型，很適合用來對待重要的外部 Vendor。';
        } else {
            // Default mock dictionary logic
            const mockResponses = {
                'vendor-negotiation': { subject: 'Clarification Required: Part Specification and Lead Time Discrepancies', vocab: ['Specification drift', 'Lead time', 'EOL (End of Life)', 'MOQ', 'Tolerance'] },
                'design-review': { subject: 'Design Review Action Items: Thermal Dissipation & Layout', vocab: ['Thermal throttling', 'Signal Integrity', 'Decoupling', 'Routing', 'Parasitics'] },
                'bug-report': { subject: 'Failure Analysis Report: Intermittent Power Delivery Issue', vocab: ['Root cause analysis', 'Reproduction steps', 'Oscilloscope', 'Voltage ripple', 'Threshold'] },
                'cross-functional': { subject: 'Hardware Sync: FW Integration Readiness', vocab: ['Blocker', 'Register map', 'Dependency', 'Validation', 'Bring-up'] },
                'email-update': { subject: 'Project Status Update: EVT Hardware Drop', vocab: ['EVT', 'Yield rate', 'Milestone', 'BOM cost', 'Mitigation plan'] },
                'apologize-design-error': { subject: 'Clarification on Recent Design Issue: Root Cause & Action Plan', vocab: ['Oversight (疏忽)', 'Root cause (根本原因)', 'Mitigation (緩解措施)', 'Board revision (改版)', 'Acknowledge (承認/認知)'] },
                'rf-matching': { subject: 'RF Matching Optimization: Antenna S11 and Efficiency', vocab: ['Impedance mismatch', 'Smith chart', 'Insertion loss', 'Return loss', 'Shunt capacitor (並聯電容)'] },
                'rf-desense': { subject: 'Desense Issue Update: EMI from High-Speed Digital Interfaces', vocab: ['Desense (靈敏度劣化)', 'Harmonics (諧波)', 'Shielding can (屏蔽罩)', 'RFI (射頻干擾)', 'Coupling (耦合)'] },
                'rf-certification': { subject: 'Certification Blocker: 3GPP Spurious Emission Failure', vocab: ['Spurious emission (雜散發射)', 'Compliance (合規)', 'Band edge (頻帶邊緣)', 'Conducted power (傳導功率)', 'EIRP'] }
            };

            const responseData = mockResponses[type] || mockResponses['email-update'];
            subject = responseData.subject;
            vocab = responseData.vocab;
            
            // Fake processing the keypoints normally
            processedPoints = keyPoints.split('\n')
                .filter(pt => pt.trim() !== '')
                .map(pt => `- ${pt.trim()}`)
                .join('\n');
                
            grammarText = '因為目前尚未填入真實的 Gemini API Key，此為離線的示範模式。\n\n若您填上實際的 API Key 並再次產生，此處將會由 AI 根據它為您寫的信件，自動用**繁體中文**生成量身打造的文法與專業句型解析！';
        }
        
        // Adjust style based on tone
        if (tone === 'professional') {
            intro = 'Hi everyone,\n\nI would like to bring your attention to the following technical details:';
            outro = '\nPlease review the provided data. Let me know if you need further clarification on this issue.\n\nBest regards,\n[Your Name]';
        } else if (tone === 'polite') {
            intro = 'Dear team,\n\nHope this email finds you well. I wanted to share some recent findings for your consideration:';
            outro = '\nI would really appreciate it if you could look into this when you have a moment. Thanks so much for your support.\n\nBest regards,\n[Your Name]';
        } else if (tone === 'urgent') {
            intro = 'Team,\n\nUrgent attention required. We have encountered a critical finding that needs immediate action:';
            outro = '\nPlease prioritize this and provide an update by EOD today.\n\nRegards,\n[Your Name]';
        } else if (tone === 'business') {
            intro = 'Hello,\n\nI am writing to formally communicate the following technical updates regarding our ongoing project:';
            outro = '\nWe appreciate your continued partnership. Please let us know if you require further details to proceed.\n\nBest regards,\n[Your Name]';
        }

        const fullMessage = `${intro}\n\n${processedPoints}\n${outro}`;

        // Populate DOM
        resultSubject.textContent = subject;
        resultMessage.innerHTML = fullMessage.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Populate Vocab
        resultVocab.innerHTML = '';
        vocab.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word;
            resultVocab.appendChild(li);
        });
        
        // Populate Grammar
        resultGrammar.innerHTML = grammarText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    // --- Conversation Simulator Functions ---
    async function startConversationSimulation(type, tone) {
        isConversing = true;
        conversationHistory = [];
        chatHistory.innerHTML = '<div class="chat-msg system">Initiating conversation... Connecting to AI.</div>';
        micBtn.disabled = true;
        micBtn.style.opacity = '0.5';
        micBtn.style.cursor = 'not-allowed';
        chatStatus.textContent = 'Initializing...';
        
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

        // Build System Instruction
        let scenarioDesc = type;
        if (type === 'bug-report') scenarioDesc = 'Bug Report / Failure Analysis meeting';
        else if (type === 'vendor-negotiation') scenarioDesc = 'Vendor Negotiation / Component Specifications meeting';
        else if (type === 'design-review') scenarioDesc = 'Design Review Meeting';
        else if (type === 'cross-functional') scenarioDesc = 'Cross-functional Team Sync';
        else if (type === 'apologize-design-error') scenarioDesc = 'Meeting to apologize for a design error';
        else if (type === 'rf-matching') scenarioDesc = 'RF Impedance Matching and Smith Chart Review';
        else if (type === 'rf-desense') scenarioDesc = 'RF Desense Issue Triage and EMI Debugging';
        else if (type === 'rf-certification') scenarioDesc = '3GPP/Carrier Certification and Compliance Discussion';

        systemInstructionText = `
            You are a native English speaker roleplaying in a hardware engineering context.
            Scenario: ${scenarioDesc}. 
            The user is a Hardware Engineer trying to practice their English communication.
            Your tone should be: ${tone}.
            Instructions:
            - Keep your responses concise, conversational, and natural (1-3 sentences max).
            - Do not act like an AI assistant. Act exactly like the designated persona (e.g., vendor, PM, colleague).
            - Always ask a follow-up question or make a statement that prompts the user to respond, keeping the conversation engaging.
        `;

        if (apiKey) {
             // Real API Initialization
             appendChatMsg('system', 'Connection established. AI is typing...');
             
             // Initial prompt from user side (hidden) to kick off the conversation
             conversationHistory.push({
                 role: 'user', 
                 parts: [{text: "Hi, I am joining the meeting now. Please start the conversation according to our scenario."}]
             });

             try {
                 const selectedModel = getSelectedModel();
                 const aiReply = await sendChatToGemini(apiKey, selectedModel);
                 appendChatMsg('ai', aiReply);
                 playTTS(aiReply);
                 chatStatus.textContent = 'Ready for your input.';
                 enableMicBtn();
             } catch (err) {
                 appendChatMsg('system', `API Error: ${err.message}`);
                 chatStatus.textContent = 'Failed to start.';
             }

        } else {
            // Mock connection delay
            setTimeout(() => {
                appendChatMsg('system', 'Mock Connection established. Audio enabled.');
                
                let openingText = "Hello! I understand we need to discuss some technical details today. How can I help you?";
                if (type === 'bug-report') {
                    openingText = "Hi team, I saw the failure analysis report regarding the ACLR issue. Could you elaborate on what you found on the ground pad?";
                } else if (type === 'vendor-negotiation') {
                    openingText = "Hello, thanks for reaching out. Are you requesting the PA load-pull data for the new module?";
                } else if (type === 'rf-matching') {
                    openingText = "Hi, I'm reviewing the Smith Chart for the new antenna trace. What S11 target are we aiming for on band 77?";
                } else if (type === 'rf-desense') {
                    openingText = "Hi everyone. We're seeing some severe cellular desense when the memory bus is active. Does anyone have logs from the near-field probe?";
                } else if (type === 'rf-certification') {
                    openingText = "Hello team, I notice we failed the spurious emission test in the latest lab report. What's our mitigation plan?";
                }
                
                setTimeout(() => {
                    appendChatMsg('ai', openingText);
                    playTTS(openingText);
                    chatStatus.textContent = 'Ready for your input. (Mock Mode)';
                    enableMicBtn();
                }, 1000);
            }, 1200);
        }
    }
    
    function enableMicBtn() {
        if (!SpeechRecognition) {
            chatStatus.textContent = 'Speech Recognition not supported in this browser. Please use Chrome/Edge.';
            return;
        }
        micBtn.disabled = false;
        micBtn.style.opacity = '1';
        micBtn.style.cursor = 'pointer';
    }

    async function handleUserVoiceInput(transcript) {
        appendChatMsg('user', transcript);
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
        
        if (apiKey) {
            conversationHistory.push({ role: 'user', parts: [{text: transcript}] });
            chatStatus.textContent = 'AI is thinking...';
            micBtn.disabled = true;
            try {
                const selectedModel = getSelectedModel();
                const aiReply = await sendChatToGemini(apiKey, selectedModel);
                conversationHistory.push({ role: 'model', parts: [{text: aiReply}] });
                appendChatMsg('ai', aiReply);
                playTTS(aiReply);
                chatStatus.textContent = 'Ready for your input.';
            } catch (err) {
                appendChatMsg('system', `API Error: ${err.message}`);
                chatStatus.textContent = 'Error processing reply.';
            }
            micBtn.disabled = false;
        } else {
             // Mock processing
             chatStatus.textContent = 'AI is thinking...';
             micBtn.disabled = true;
             setTimeout(() => {
                 const aiReply = "I see. We will immediately check the SMT stencil on our production line to see if it's clogged. I'll get back to you with a report by EOD.";
                 appendChatMsg('ai', aiReply);
                 playTTS(aiReply);
                 chatStatus.textContent = 'Ready for your input. (Mock Mode)';
                 micBtn.disabled = false;
             }, 2000);
        }
    }

    async function sendChatToGemini(apiKey, model = 'gemini-3.5-flash') {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const requestBody = {
            systemInstruction: { parts: [{ text: systemInstructionText }] },
            contents: conversationHistory,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 250 // Conversational length
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    }

    function appendChatMsg(sender, text) {
        const div = document.createElement('div');
        div.className = `chat-msg ${sender}`;
        div.textContent = text;
        chatHistory.appendChild(div);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    function playTTS(text) {
        // Reuse existing TTS logic briefly
        const openAiKey = openAiKeyInput ? openAiKeyInput.value.trim() : '';
        if (openAiKey) {
             // Basic implementation of OpenAI TTS for conversation wrapper if needed
             // Due to simplicity, we can fallback to native synth quickly for conversation
             playLocalTTS(text);
        } else {
            playLocalTTS(text);
        }
    }

    // Mic Button Interaction (Web Speech API)
    micBtn.addEventListener('click', () => {
        if (!isConversing || !SpeechRecognition) return;
        
        if (isRecording) {
            // Stop recording
            isRecording = false;
            recognition.stop();
            micBtn.classList.remove('active');
            micBtnText.textContent = 'Push to Talk';
            chatStatus.textContent = 'Processing your speech...';
            
            if (finalTranscript.trim() !== '') {
                handleUserVoiceInput(finalTranscript.trim());
            }
            finalTranscript = '';
        } else {
            // Start recording
            try {
                finalTranscript = '';
                recognition.start();
                isRecording = true;
                micBtn.classList.add('active');
                micBtnText.textContent = 'Recording... (Click to stop)';
                chatStatus.textContent = 'Listening...';
            } catch (err) {
                console.error(err);
                if (err.name === 'NotAllowedError') {
                    chatStatus.textContent = 'Microphone access denied.';
                } else {
                    chatStatus.textContent = 'Please clear previous speech first.';
                }
            }
        }
    });

});
