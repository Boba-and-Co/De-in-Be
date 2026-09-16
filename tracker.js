(function () {
  const WEBHOOK_URL = 'PASTE_GOOGLE_APPS_SCRIPT_URL_HERE';
  let studentName = sessionStorage.getItem('h5p_student');

  if (!studentName) {
    studentName = prompt("Please enter your name:") || "Anonymous";
    sessionStorage.setItem('h5p_student', studentName);
  }

  function attachDispatcher() {
    if (window.H5P && window.H5P.externalDispatcher) {
      H5P.externalDispatcher.on('xAPI', function (event) {
        const statement = event.data.statement;

        if (statement.result && statement.result.completion) {
          setTimeout(() => {
            const sentenceGroups = document.querySelectorAll('.h5p-question-content div[role="group"]');
            if (!sentenceGroups || sentenceGroups.length === 0) return;

            let accumulatedText = "";
            let errorRanges = [];

            sentenceGroups.forEach(group => {
              const wrongElements = group.querySelectorAll('.h5p-wrong');
              if (wrongElements.length === 0) return;

              const p = group.querySelector('p');
              if (!p) return;

              if (accumulatedText.length > 0) accumulatedText += "\n";

              let currentLine = "";
              p.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                  currentLine += node.textContent;
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  if (node.classList.contains('hidden-but-read')) return;
                  const input = node.querySelector('input') || (node.tagName === 'INPUT' ? node : null);
                  if (input) {
                    const val = (input.value && input.value.trim() !== '') ? input.value : '___';
                    const isWrong = node.classList.contains('h5p-wrong') || input.classList.contains('h5p-wrong');
                    const start = accumulatedText.length + currentLine.length;
                    const end = start + val.length;

                    currentLine += val;
                    if (isWrong) errorRanges.push({ start: start, end: end });
                  } else {
                    currentLine += node.textContent || '';
                  }
                }
              });

              accumulatedText += currentLine.replace(/[\u00A0\s]+/g, ' ').trim();
            });

            const payload = {
              timestamp: new Date().toISOString(),
              student: studentName,
              activity: statement.object.definition.name ? (statement.object.definition.name['en-US'] || 'H5P Activity') : 'H5P Activity',
              score: event.getScore(),
              maxScore: event.getMaxScore(),
              sentence: accumulatedText || "All answers correct!",
              errors: accumulatedText ? errorRanges : []
            };

            fetch(WEBHOOK_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }, 150);
        }
      });
    } else {
      setTimeout(attachDispatcher, 200);
    }
  }

  attachDispatcher();
})();
