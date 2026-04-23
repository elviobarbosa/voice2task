document.getElementById('audio').addEventListener('change', function(e) {
  const fileName = e.target.files[0]?.name || 'Selecione um arquivo de áudio...';
  document.getElementById('file-name').textContent = fileName;
});

async function send() {
  const fileInput = document.getElementById('audio');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Por favor, selecione um arquivo de áudio primeiro.');
    return;
  }

  const btn = document.getElementById('process-btn');
  const loading = document.getElementById('loading');
  const resultContainer = document.getElementById('result-container');
  const summaryText = document.getElementById('summary-text');
  const tasksList = document.getElementById('tasks-list');

  // UI state updates
  btn.disabled = true;
  resultContainer.classList.add('hidden');
  loading.classList.remove('hidden');

  const formData = new FormData();
  formData.append("audio", file);

  try {
    const res = await fetch("http://localhost:3000/process", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao processar áudio');
    }

    const data = await res.json();
    
    // Render Summary
    summaryText.textContent = data.summary || 'Nenhum resumo disponível.';
    
    // Render Tasks
    tasksList.innerHTML = '';
    if (data.tasks && data.tasks.length > 0) {
      data.tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        
        const priorityClass = task.priority ? `priority-${task.priority.toLowerCase()}` : '';
        
        let metaHtml = '';
        if (task.priority) metaHtml += `<span class="badge ${priorityClass}">Prioridade: ${task.priority}</span>`;
        if (task.deadline) metaHtml += `<span class="badge">⏰ ${task.deadline}</span>`;
        if (task.assignee) metaHtml += `<span class="badge">👤 ${task.assignee}</span>`;

        li.innerHTML = `
          <div class="task-text">${task.text}</div>
          <div class="task-meta">${metaHtml}</div>
        `;
        tasksList.appendChild(li);
      });
    } else {
      tasksList.innerHTML = '<li class="task-item"><div class="task-text" style="color: var(--text-muted)">Nenhuma tarefa identificada.</div></li>';
    }

    resultContainer.classList.remove('hidden');
  } catch (error) {
    alert(`Erro: ${error.message}`);
  } finally {
    btn.disabled = false;
    loading.classList.add('hidden');
  }
}
