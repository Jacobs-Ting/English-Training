document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('scenario-form');
    const typeSelect = document.getElementById('scenario-type');
    const formatSelect = document.getElementById('comm-format');
    const keyPointsArea = document.getElementById('key-points');
    const apiKeyInput = document.getElementById('api-key');
    const wordCount = document.querySelector('.word-count');
    const generateBtn = document.querySelector('.generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    
    const outputEmpty = document.getElementById('output-empty');
    const outputResult = document.getElementById('output-result');
    
    // Result elements
    const resultSubject = document.getElementById('result-subject');
    const resultMessage = document.getElementById('result-message');
    const resultVocab = document.getElementById('result-vocab');
    const resultGrammar = document.getElementById('result-grammar');

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
                const aiData = await generateEnglishEmail(keyPoints, tone, apiKey, format);
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

    async function generateEnglishEmail(keyPoints, tone, apiKey, format) {
        // Use gemini-2.5-flash for the latest model support
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
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
                'apologize-design-error': { subject: 'Clarification on Recent Design Issue: Root Cause & Action Plan', vocab: ['Oversight (疏忽)', 'Root cause (根本原因)', 'Mitigation (緩解措施)', 'Board revision (改版)', 'Acknowledge (承認/認知)'] }
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
});
