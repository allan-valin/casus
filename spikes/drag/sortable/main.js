import Sortable from 'sortablejs';
const words = ['Caesar', 'in Galliam', 'magnam', 'cum legione', 'venit', 'senatus', 'populus', 'que', 'Romanus'];
const pool = document.createElement('div');
pool.className = 'pool';
for (const w of words) {
  const pill = document.createElement('div');
  pill.className = 'pill' + (w.includes(' ') ? ' chunk' : '');
  pill.textContent = w;
  pill.dataset.text = w;
  pool.appendChild(pill);
}
document.getElementById('app').appendChild(pool);
Sortable.create(pool, { animation: 150, swapThreshold: 0.5 });
