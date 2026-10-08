import PptxGenJS from 'pptxgenjs';

const GREEN = '12372A';
const DEEP = '0B2A1F';
const GOLD = 'F5B301';
const INK = '0E1F18';
const MUTED = '55665D';
const FONT = 'Segoe UI';

/** One PowerPoint deck per module: a cover, then each lesson's slides with the narration as speaker notes. */
export async function moduleDeck({ courseTitle, moduleIndex, moduleTitle, lessons }) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pptx.title = `${courseTitle}: Module ${moduleIndex + 1}`;
  pptx.company = 'Core5Campus';

  pptx.defineSlideMaster({
    title: 'CONTENT',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: GREEN } } },
      { rect: { x: 0.18, y: 0, w: 0.06, h: 7.5, fill: { color: GOLD } } },
      { text: { text: 'Core5Campus', options: { x: 10.4, y: 0.3, w: 2.6, h: 0.45, align: 'right', fontFace: FONT, fontSize: 14, bold: true, color: GREEN } } },
      { text: { text: `Core5Campus  ·  ${courseTitle}`, options: { x: 0.7, y: 6.95, w: 9, h: 0.35, fontFace: FONT, fontSize: 10, color: MUTED } } },
    ],
    slideNumber: { x: 12.3, y: 6.95, w: 0.6, h: 0.35, fontFace: FONT, fontSize: 10, color: MUTED },
  });

  const cover = pptx.addSlide();
  cover.background = { color: GREEN };
  cover.addText([{ text: 'Core5', options: { color: 'FFFFFF' } }, { text: 'Campus', options: { color: GOLD } }], { x: 1.1, y: 0.7, w: 5, h: 0.7, fontFace: FONT, fontSize: 26, bold: true });
  cover.addShape(pptx.ShapeType.rect, { x: 0.7, y: 2.2, w: 0.12, h: 2.4, fill: { color: GOLD } });
  cover.addText(`MODULE ${moduleIndex + 1}`, { x: 1.1, y: 2.1, w: 11, h: 0.5, fontFace: FONT, fontSize: 16, bold: true, color: GOLD, charSpacing: 4 });
  cover.addText(moduleTitle, { x: 1.1, y: 2.6, w: 11, h: 1.4, fontFace: FONT, fontSize: 40, bold: true, color: 'FFFFFF' });
  cover.addText(courseTitle, { x: 1.1, y: 4.0, w: 11, h: 0.6, fontFace: FONT, fontSize: 20, color: 'D1E0D6' });
  cover.addText(lessons.map((l, i) => ({ text: `${i + 1}. ${l.title}`, options: { breakLine: true } })),
    { x: 1.1, y: 4.9, w: 11, h: 1.6, fontFace: FONT, fontSize: 14, color: 'B9CFC0', valign: 'top' });

  lessons.forEach((lesson, li) => {
    const intro = pptx.addSlide();
    intro.background = { color: DEEP };
    intro.addText([{ text: 'Core5', options: { color: 'FFFFFF' } }, { text: 'Campus', options: { color: GOLD } }], { x: 9.9, y: 0.4, w: 3, h: 0.5, align: 'right', fontFace: FONT, fontSize: 16, bold: true });
    intro.addText(`LESSON ${moduleIndex + 1}.${li + 1}`, { x: 0.9, y: 1.4, w: 11, h: 0.5, fontFace: FONT, fontSize: 14, bold: true, color: GOLD, charSpacing: 4 });
    intro.addText(lesson.title, { x: 0.9, y: 1.9, w: 11.5, h: 1.6, fontFace: FONT, fontSize: 34, bold: true, color: 'FFFFFF', valign: 'top' });
    intro.addText('In this lesson you will', { x: 0.9, y: 3.8, w: 11, h: 0.4, fontFace: FONT, fontSize: 14, color: 'B9CFC0' });
    intro.addText(lesson.objectives.map((o) => ({ text: o, options: { bullet: { code: '25B8' }, breakLine: true } })),
      { x: 0.9, y: 4.2, w: 11.5, h: 2.4, fontFace: FONT, fontSize: 18, color: 'FFFFFF', valign: 'top', paraSpaceAfter: 6 });

    lesson.slides.forEach((s, si) => {
      const slide = pptx.addSlide({ masterName: 'CONTENT' });
      slide.addText(`${moduleIndex + 1}.${li + 1}  ·  ${si + 1}/${lesson.slides.length}`, { x: 0.7, y: 0.45, w: 6, h: 0.35, fontFace: FONT, fontSize: 11, bold: true, color: 'D99A00' });
      slide.addText(s.title, { x: 0.7, y: 0.8, w: 12, h: 1.0, fontFace: FONT, fontSize: 30, bold: true, color: INK });
      if (s.points.length) {
        slide.addText(s.points.map((p) => ({ text: p, options: { bullet: { code: '25CF' }, breakLine: true } })),
          { x: 0.9, y: 2.0, w: 11.6, h: 4.6, fontFace: FONT, fontSize: 22, color: INK, valign: 'top', paraSpaceAfter: 14 });
      }
      slide.addNotes(s.narration || '');
    });

    if (lesson.takeaways.length) {
      const keys = pptx.addSlide({ masterName: 'CONTENT' });
      keys.addText('Key takeaways', { x: 0.7, y: 0.8, w: 12, h: 1.0, fontFace: FONT, fontSize: 30, bold: true, color: GREEN });
      keys.addText(lesson.takeaways.map((t) => ({ text: t, options: { bullet: { code: '2714' }, breakLine: true } })),
        { x: 0.9, y: 2.0, w: 11.6, h: 4.6, fontFace: FONT, fontSize: 22, color: INK, valign: 'top', paraSpaceAfter: 14 });
    }
  });

  return pptx.write({ outputType: 'nodebuffer' });
}
