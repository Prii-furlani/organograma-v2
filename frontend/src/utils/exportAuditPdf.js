import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportAuditPdf(logs = [], filtros = {}) {
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cores JHE
  const azulEscuro = [14, 40, 78]; // #0E284E
  const ciano = [97, 203, 232]; // #61CBE8
  const textoMuted = [100, 116, 139]; // #64748B
  const bordaSuave = [226, 232, 240]; // #E2E8F0

  // 1. Cabeçalho Minimalista (Fundo Branco + Friso Ciano)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...azulEscuro);
  doc.text('JHE ENGENHARIA', 40, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textoMuted);
  doc.text('Relatório de Auditoria e Governança Corporativa', 40, 50);

  // Data de Emissão à direita
  const dataEmissao = new Date().toLocaleString('pt-BR');
  doc.text(`Emitido em: ${dataEmissao}`, pageWidth - 40, 36, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...azulEscuro);
  doc.text(`Total: ${logs.length} registro(s)`, pageWidth - 40, 50, { align: 'right' });

  // Linha sutil divisória
  doc.setDrawColor(...ciano);
  doc.setLineWidth(1.5);
  doc.line(40, 58, pageWidth - 40, 58);

  // 2. Parâmetros da Consulta (Card Claro e Limpo)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 70, pageWidth - 80, 32, 4, 4, 'F');
  doc.setDrawColor(...bordaSuave);
  doc.setLineWidth(0.5);
  doc.roundedRect(40, 70, pageWidth - 80, 32, 4, 4, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...azulEscuro);
  doc.text('FILTROS APLICADOS:', 52, 90);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textoMuted);
  const dataIni = filtros.dataInicio || filtros.data_inicio;
  const dataFim = filtros.dataFim || filtros.data_fim;
  const usuarioFiltro = filtros.usuarioNome || filtros.usuario || 'Todos';
  const acaoFiltro = filtros.acaoNome || filtros.acao || 'Todas';

  const periodo = dataIni || dataFim
    ? `${dataIni || 'Início'} até ${dataFim || 'Hoje'}`
    : 'Todo o histórico';
  doc.text(`Período: ${periodo}   |   Usuário: ${usuarioFiltro}   |   Ação: ${acaoFiltro}`, 175, 90);

  // 3. Montagem das Linhas
  const tableData = logs.map((log, index) => {
    const dataHoraRaw = log.data_hora || log.created_at || log.timestamp;
    const dataHora = dataHoraRaw ? new Date(dataHoraRaw).toLocaleString('pt-BR') : '—';
    const entidade =
      log.entidade_afetada ||
      log.entidade_titulo ||
      log.no_titulo ||
      log.titulo ||
      (log.no_id ? `Nó #${log.no_id}` : 'Geral');

    let detalhe = '';
    let detalhesObj = {};
    try {
      detalhesObj = typeof log.detalhes === 'string' ? JSON.parse(log.detalhes) : (log.detalhes || {});
    } catch {
      detalhesObj = {};
    }

    const cleanVal = (val) => {
      if (val === null || val === undefined || val === '') return '-';
      return String(val).replace(/["']/g, '').trim();
    };

    if (log.acao === 'MOVIMENTACAO') {
      if (detalhesObj.diff?.area_superior) {
        const de = cleanVal(detalhesObj.diff.area_superior.de);
        const para = cleanVal(detalhesObj.diff.area_superior.para);
        detalhe = `Nova subordinacao: ${de} -> ${para}`;
      } else {
        const novoPai = cleanVal(detalhesObj.novo_pai_titulo || detalhesObj.novo_pai || detalhesObj.resumo || 'Raiz');
        detalhe = `Nova subordinacao: ${novoPai}`;
      }
    } else if (log.acao === 'EDICAO' && detalhesObj.campos_alterados) {
      detalhe = Object.entries(detalhesObj.campos_alterados)
        .map(([k, v]) => `${k}: ${cleanVal(v?.de)} -> ${cleanVal(v?.para)}`)
        .join(' | ');
    } else if (detalhesObj.diff && typeof detalhesObj.diff === 'object') {
      detalhe = Object.entries(detalhesObj.diff)
        .map(([k, v]) => `${k}: ${cleanVal(v?.de)} -> ${cleanVal(v?.para)}`)
        .join(' | ');
    } else {
      detalhe = cleanVal(detalhesObj.resumo || detalhesObj.descricao || JSON.stringify(detalhesObj));
    }

    return [
      String(index + 1).padStart(2, '0'),
      dataHora,
      log.acao || '-',
      log.modulo || detalhesObj.modulo || 'Organograma',
      log.usuario_nome || 'Sistema',
      entidade,
      detalhe
    ];
  });

  // 4. Tabela Executiva Minimalista
  autoTable(doc, {
    startY: 115,
    margin: { left: 40, right: 40, bottom: 35 },
    head: [['#', 'DATA / HORA', 'AÇÃO', 'MÓDULO', 'USUÁRIO', 'ENTIDADE AFETADA', 'DETALHAMENTO']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 6,
      textColor: [51, 65, 85],
      valign: 'middle',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: azulEscuro,
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' }, // # (22 pt)
      1: { cellWidth: 88 },                   // DATA / HORA (88 pt)
      2: { cellWidth: 70, fontStyle: 'bold' }, // AÇÃO (70 pt)
      3: { cellWidth: 80 },                   // MÓDULO (80 pt)
      4: { cellWidth: 95 },                   // USUÁRIO (95 pt)
      5: { cellWidth: 115, fontStyle: 'bold' },// ENTIDADE AFETADA (115 pt)
      6: { cellWidth: 292 }                   // DETALHAMENTO (292 pt) -> Soma exata = 762 pt
    },
    didDrawCell: (data) => {
      // Borda horizontal inferior sutil em cada linha
      if (data.section === 'body') {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
    didDrawPage: (data) => {
      // Rodapé
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'JHE Engenharia — Documento Interno de Governança',
        40,
        doc.internal.pageSize.getHeight() - 15
      );
      doc.text(
        `Página ${data.pageNumber} de ${doc.internal.getNumberOfPages()}`,
        pageWidth - 40,
        doc.internal.pageSize.getHeight() - 15,
        { align: 'right' }
      );
    }
  });

  doc.save(`auditoria_jhe_${new Date().toISOString().slice(0, 10)}.pdf`);
}
