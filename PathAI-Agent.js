window.onload = function() {
    const savedRoadmap = localStorage.getItem('pathAIRoadmap');
    if (savedRoadmap) {
        renderRoadmap(savedRoadmap);
        loadCheckState();
    }
};

function linkify(text) {
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlPattern, url => `<a href="${url}" target="_blank" class="text-indigo-400 font-bold underline">View Resource</a>`);
}

async function generatePath() {
    const topic = document.getElementById('userPrompt').value;
    if (!topic) return alert("Please enter a goal first!");

    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('resultArea').classList.add('hidden');

    try {
        const res = await fetch('https://abhay-automate-everything.app.n8n.cloud/webhook/generate-path', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatInput: topic
            })
        });
        const data = await res.json();
        const content = data.learningPath || data.learningpath || data.output;

        if (content) {
            localStorage.setItem('pathAIRoadmap', content);
            renderRoadmap(content);
        }
    } catch (err) {
        alert("n8n Workflow is not ACTIVE!");
    } finally {
        document.getElementById('loader').classList.add('hidden');
    }
}

function renderRoadmap(content) {
    // Content ko "📅 DAY" ya "DAY" ke basis par split karna
    // Taaki har din ka apna ek alag card ho
    const dayBlocks = content.split(/📅 DAY \d+:|DAY \d+:/g).filter(b => b.trim() !== "");
    let html = "";

    // Header Goal ko top par dikhana
    const goalMatch = content.match(/🚀 GOAL: .*/);
    if (goalMatch) {
        html += `<div class="p-4 bg-indigo-900/30 rounded-2xl border border-indigo-500/20 text-center font-bold text-indigo-300 mb-6">${goalMatch[0]}</div>`;
    }

    dayBlocks.forEach((block, i) => {
        const dayNum = i + 1;
        // Text ko clean karna aur links clickable banana
        const cleanContent = linkify(block.trim().replace(/\n/g, '<br>'));

        html += `
            <div class="day-card rounded-2xl overflow-hidden mb-6 shadow-lg bg-gray-900/40 border border-gray-800">
                <div class="p-4 flex items-center justify-between bg-white/5 border-b border-gray-800">
                    <div class="flex items-center gap-3">
                        <input type="checkbox" id="check-${dayNum}" class="roadmap-check w-5 h-5 accent-purple-500 cursor-pointer" onchange="syncProgress()">
                        <span class="font-black text-purple-400 text-sm tracking-widest uppercase">DAY ${dayNum}</span>
                    </div>
                    <span class="text-[10px] text-gray-500 font-bold uppercase">In Progress</span>
                </div>
                <div class="p-5 text-sm text-gray-300 leading-relaxed">
                    ${cleanContent}
                </div>
            </div>`;
    });

    document.getElementById('roadmapDisplay').innerHTML = html;
    document.getElementById('resultArea').classList.remove('hidden');
    document.getElementById('progressSection').classList.remove('hidden');
    syncProgress();
}

function syncProgress() {
    const total = document.querySelectorAll('.roadmap-check').length;
    const checked = document.querySelectorAll('.roadmap-check:checked').length;
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

    document.getElementById('progressBar').style.width = percentage + "%";
    document.getElementById('progressText').innerText = percentage + "% Completed";

    // Save checkbox states
    const states = Array.from(document.querySelectorAll('.roadmap-check')).map(c => c.checked);
    localStorage.setItem('pathAIChecks', JSON.stringify(states));
}

function loadCheckState() {
    const saved = JSON.parse(localStorage.getItem('pathAIChecks'));
    if (saved) {
        const checks = document.querySelectorAll('.roadmap-check');
        checks.forEach((c, i) => {
            if (saved[i]) c.checked = true;
        });
        syncProgress();
    }
}

function clearData() {
    if (confirm("Are you sure? This will delete your current progress.")) {
        localStorage.clear();
        location.reload();
    }
}

function downloadPDF() {
    const element = document.getElementById('downloadSection');
    const opt = {
        margin: 10,
        filename: 'MyPathAI_Roadmap.pdf',
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#0f172a'
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };
    html2pdf().set(opt).from(element).save();
}

function toggleChat() {
    const chat = document.getElementById('chatWindow');
    chat.style.display = (chat.style.display === 'flex' ? 'none' : 'flex');
}

async function askDoubt() {
    const input = document.getElementById('chatInput');
    const box = document.getElementById('chatBox');
    if (!input.value.trim()) return;

    const userText = input.value;
    box.innerHTML += `<div class="p-4 bg-indigo-600/20 rounded-2xl text-right ml-10 text-white font-medium border border-indigo-500/10">You: ${userText}</div>`;
    input.value = '';
    box.scrollTop = box.scrollHeight;

    try {
        const res = await fetch('https://abhay-automate-everything.app.n8n.cloud/webhook/doubt-solver', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: userText,
                context: localStorage.getItem('pathAIRoadmap')
            })
        });
        const data = await res.json();
        const aiMsg = data.output || data.text || "I am processing your query...";
        box.innerHTML += `<div class="p-4 bg-gray-800/80 rounded-2xl mr-10 text-indigo-300 font-medium border border-gray-700/50">Mentor: ${linkify(aiMsg)}</div>`;
        box.scrollTop = box.scrollHeight;
    } catch (err) {
        box.innerHTML += `<div class="text-red-400 p-2 text-center text-[10px]">Error connecting to Mentor.</div>`;
    }
}