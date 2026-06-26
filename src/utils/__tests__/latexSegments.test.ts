import { parseLatexSegments } from '../latexSegments';

describe('parseLatexSegments', () => {
  it('纯文本：返回单个 text 段', () => {
    const result = parseLatexSegments('Hello world, no math here.');
    expect(result).toEqual([
      { type: 'text', content: 'Hello world, no math here.', offset: 0 },
    ]);
  });

  it('空字符串：返回空数组', () => {
    expect(parseLatexSegments('')).toEqual([]);
  });

  it('行内公式：text + inline-math + text', () => {
    const result = parseLatexSegments('能量公式 $E=mc^2$ 很著名');
    expect(result).toEqual([
      { type: 'text', content: '能量公式 ', offset: 0 },
      { type: 'inline-math', latex: 'E=mc^2', raw: '$E=mc^2$', offset: 5 },
      { type: 'text', content: ' 很著名', offset: 13 },
    ]);
  });

  it('块级公式：单独成段', () => {
    const result = parseLatexSegments('前文\n$$\\int_0^1 x\\,dx$$\n后文');
    expect(result).toEqual([
      { type: 'text', content: '前文\n', offset: 0 },
      {
        type: 'block-math',
        latex: '\\int_0^1 x\\,dx',
        raw: '$$\\int_0^1 x\\,dx$$',
        offset: 3,
      },
      { type: 'text', content: '\n后文', offset: 21 },
    ]);
  });

  it('混合：行内 + 块级 + 文本顺序正确', () => {
    const input = 'a $x$ b $$y$$ c';
    const result = parseLatexSegments(input);
    expect(result.map((s) => s.type)).toEqual([
      'text',
      'inline-math',
      'text',
      'block-math',
      'text',
    ]);
    // offset 能还原原文
    for (const seg of result) {
      const len =
        seg.type === 'text' ? seg.content.length : seg.raw.length;
      expect(input.slice(seg.offset, seg.offset + len)).toBe(
        seg.type === 'text' ? seg.content : seg.raw
      );
    }
  });

  it('未闭合行内 $：剩余按纯文本处理', () => {
    const result = parseLatexSegments('价格是 $5 美元未闭合');
    expect(result).toEqual([
      { type: 'text', content: '价格是 $5 美元未闭合', offset: 0 },
    ]);
  });

  it('未闭合块级 $$：剩余按纯文本处理', () => {
    const result = parseLatexSegments('开始 $$a+b 没有结束');
    expect(result).toEqual([
      { type: 'text', content: '开始 $$a+b 没有结束', offset: 0 },
    ]);
  });

  it('已闭合公式后再出现未闭合 $：前半正常解析，后半归文本', () => {
    const result = parseLatexSegments('$a$ then $unterminated');
    expect(result).toEqual([
      { type: 'inline-math', latex: 'a', raw: '$a$', offset: 0 },
      { type: 'text', content: ' then $unterminated', offset: 3 },
    ]);
  });

  it('转义的 \\$ 不作为公式分隔符', () => {
    const result = parseLatexSegments('成本 \\$5 与 \\$10');
    expect(result).toEqual([
      { type: 'text', content: '成本 \\$5 与 \\$10', offset: 0 },
    ]);
  });

  it('空公式 $$$$ 按纯文本处理，不产生空 math 段', () => {
    const result = parseLatexSegments('a$$$$b');
    expect(result).toEqual([{ type: 'text', content: 'a$$$$b', offset: 0 }]);
  });

  it('空行内公式 $ $ 按纯文本处理', () => {
    const result = parseLatexSegments('a $ $ b');
    expect(result).toEqual([{ type: 'text', content: 'a $ $ b', offset: 0 }]);
  });

  it('公式内含 trim：latex 去除首尾空白但 raw 保留', () => {
    const result = parseLatexSegments('$$  a+b  $$');
    expect(result).toEqual([
      { type: 'block-math', latex: 'a+b', raw: '$$  a+b  $$', offset: 0 },
    ]);
  });
});
