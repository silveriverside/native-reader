import { parseOCRContent } from '../VolcengineProvider';

describe('parseOCRContent', () => {
  it('标准 JSON：提取 markdown 与页码', () => {
    const content = JSON.stringify({ markdown: '# 标题\n正文', pageNumber: 42 });
    expect(parseOCRContent(content)).toEqual({
      markdown: '# 标题\n正文',
      pageNumber: 42,
    });
  });

  it('页码为 null：保持 null', () => {
    const content = JSON.stringify({ markdown: '正文', pageNumber: null });
    expect(parseOCRContent(content)).toEqual({
      markdown: '正文',
      pageNumber: null,
    });
  });

  it('页码字段缺失：页码为 null', () => {
    const content = JSON.stringify({ markdown: '正文' });
    expect(parseOCRContent(content).pageNumber).toBeNull();
  });

  it('页码为字符串数字："17" -> 17', () => {
    const content = JSON.stringify({ markdown: 'x', pageNumber: '17' });
    expect(parseOCRContent(content).pageNumber).toBe(17);
  });

  it('页码非法（0/负数/非数字字符串）：归 null，绝不伪造', () => {
    expect(
      parseOCRContent(JSON.stringify({ markdown: 'x', pageNumber: 0 })).pageNumber
    ).toBeNull();
    expect(
      parseOCRContent(JSON.stringify({ markdown: 'x', pageNumber: -3 }))
        .pageNumber
    ).toBeNull();
    expect(
      parseOCRContent(JSON.stringify({ markdown: 'x', pageNumber: 'abc' }))
        .pageNumber
    ).toBeNull();
  });

  it('被 ```json 围栏包裹：仍能解析', () => {
    const content = '```json\n{"markdown":"正文","pageNumber":5}\n```';
    expect(parseOCRContent(content)).toEqual({
      markdown: '正文',
      pageNumber: 5,
    });
  });

  it('非 JSON 纯文本：整段当 markdown，页码为 null', () => {
    const content = '这是模型直接吐出的 Markdown 正文 $E=mc^2$';
    expect(parseOCRContent(content)).toEqual({
      markdown: content,
      pageNumber: null,
    });
  });

  it('空内容：返回空 markdown + null', () => {
    expect(parseOCRContent('   ')).toEqual({ markdown: '', pageNumber: null });
  });

  it('小数页码取整', () => {
    const content = JSON.stringify({ markdown: 'x', pageNumber: 12.9 });
    expect(parseOCRContent(content).pageNumber).toBe(12);
  });
});
