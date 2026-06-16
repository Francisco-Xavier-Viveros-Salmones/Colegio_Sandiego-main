const fs = require('fs');

const path = 'frontend/panel.html';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Find start and end of Boleta Virtual
const startIdx = lines.findIndex(l => l.includes('<!-- Boleta Virtual -->'));
let endIdx = -1;
for (let i = startIdx + 1; i < lines.length; i++) {
  if (lines[i].includes('<div class="flex justify-between items-center mt-6">')) {
    endIdx = i - 1; // The </div> before it
    break;
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  // Extract the block
  const boletaBlock = lines.slice(startIdx, endIdx + 1);
  
  // Remove the block
  lines.splice(startIdx, endIdx - startIdx + 1);

  // Find where to insert tab button
  const btnInsertIdx = lines.findIndex(l => l.includes('Historial de Pagos</button>')) + 1;

  const tabBtn = [
    '                    <button class="px-4 py-3 text-sm font-medium flex items-center"',
    '                      :class="tabAlumnoFicha===\'calificaciones\'?\'text-navy-700 border-b-2 border-navy-700\':\'text-gray-500\'"',
    '                      @click="tabAlumnoFicha=\'calificaciones\'"><i data-lucide="graduation-cap" class="w-4 h-4 mr-2"></i> Calificaciones</button>'
  ];
  
  lines.splice(btnInsertIdx, 0, ...tabBtn);

  // Find where to insert tab content (after historial_pagos content)
  // Search for the end of the historial_pagos tab
  const contentStartIdx = lines.findIndex(l => l.includes('tabAlumnoFicha===\'historial_pagos\'') && l.includes('<div'));
  let divsToClose = 0;
  let contentEndIdx = -1;
  for (let i = contentStartIdx; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<div')) divsToClose += (line.match(/<div/g) || []).length;
    if (line.includes('</div')) divsToClose -= (line.match(/<\/div/g) || []).length;
    
    if (divsToClose === 0) {
      contentEndIdx = i;
      break;
    }
  }

  const tabContent = [
    '                  <!-- Pestaña: Calificaciones -->',
    '                  <div class="p-5" x-show="tabAlumnoFicha===\'calificaciones\'">',
    ...boletaBlock,
    '                  </div>'
  ];

  lines.splice(contentEndIdx + 1, 0, ...tabContent);

  fs.writeFileSync(path, lines.join('\n'), 'utf8');
  console.log('Modificación exitosa.');
} else {
  console.log('No se encontraron los índices', {startIdx, endIdx});
}
