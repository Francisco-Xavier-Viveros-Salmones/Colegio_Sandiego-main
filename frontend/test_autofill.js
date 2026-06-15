const pagoAdeudos = [
  { concepto: 'material', montoOriginal: 1200, montoRecargo: 0, montoPagado: 0 },
  { concepto: 'colegiatura', montoOriginal: 4000, montoRecargo: 0, montoPagado: 0 },
  { concepto: 'colegiatura', montoOriginal: 4000, montoRecargo: 0, montoPagado: 0 }
];

function autofillMonto(nuevoPagoConcepto) {
  const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const selConcepto = normalize(nuevoPagoConcepto);
  
  const adeudosDelConcepto = pagoAdeudos.filter(a => {
     const dbConcepto = normalize(a.concepto);
     if (selConcepto.includes('MATERIAL') && dbConcepto.includes('MATERIAL')) return true;
     if (selConcepto.includes('INSCRIPCION') && dbConcepto.includes('INSCRIPCION')) return true;
     if (selConcepto.includes('UNIFORME') && dbConcepto.includes('UNIFORME')) return true;
     if (selConcepto.includes('COLEGIATURA') && dbConcepto.includes('COLEGIATURA')) return true;
     return dbConcepto === selConcepto;
  });
  
  if (adeudosDelConcepto.length > 0) {
    let total = 0;
    adeudosDelConcepto.forEach(d => {
       const deuda = Number(d.montoOriginal) + Number(d.montoRecargo) - Number(d.montoPagado);
       total += Math.max(0, deuda);
    });
    return total.toFixed(2);
  } else {
    return '';
  }
}

console.log("Colegiatura ->", autofillMonto("Colegiatura"));
console.log("Material Didáctico ->", autofillMonto("Material Didáctico"));
