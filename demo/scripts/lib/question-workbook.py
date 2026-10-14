#!/usr/bin/env python3
"""Export the editable master sheet with Python 3 stdlib; never touches the game.

Usage: python3 导出审核题库.py [--workbook file.xlsx] [--base file.json]
       [--output file.json] [--approved-pools file.json]
"""
import argparse
import copy
import json
import re
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
ROOT = Path(__file__).resolve().parent
HEADERS = ['编号','主题','关卡','难度','知识点','地区','题干','A选项','B选项','C选项','D选项','正确答案','答案内容','解析','来源编号','来源标题','来源链接','出题依据','审核状态','启用状态','版本','审核意见']
LABELS = ['基础认知','进阶理解','深度应用','综合挑战']
LEGACY = ['基础','进阶','进阶','综合']

def master_rows(workbook):
    with zipfile.ZipFile(workbook) as z:
        wb = ET.fromstring(z.read('xl/workbook.xml'))
        rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        target_by_id = {r.attrib['Id']: r.attrib['Target'] for r in rels}
        sheet = next(s for s in wb.find('s:sheets', NS) if s.attrib['name'] == '题库总表')
        target = target_by_id[sheet.attrib['{' + NS['r'] + '}id']]
        part = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            strings = [''.join(si.itertext()) for si in ET.fromstring(z.read('xl/sharedStrings.xml'))]
        xml = ET.fromstring(z.read(part))
        rows = []
        for row in xml.findall('s:sheetData/s:row', NS):
            row_number = int(row.attrib['r'])
            if row_number < 4:
                continue
            values = [''] * 22
            for cell in row.findall('s:c', NS):
                address = cell.attrib['r']
                column = re.match(r'[A-Z]+', address).group(0)
                index = 0
                for char in column:
                    index = index * 26 + ord(char) - 64
                index -= 1
                if index >= 22:
                    continue
                kind = cell.attrib.get('t')
                v = cell.find('s:v', NS)
                if kind == 'inlineStr':
                    inline = cell.find('s:is', NS)
                    value = ''.join(inline.itertext()) if inline is not None else ''
                elif v is None or v.text is None:
                    value = ''
                elif kind == 's':
                    value = strings[int(v.text)]
                elif kind == 'e':
                    raise ValueError(f'{address} 含公式错误：{v.text}')
                else:
                    value = v.text
                values[index] = value.strip() if isinstance(value, str) else value
            if row_number == 4:
                if values != HEADERS:
                    raise ValueError('总表表头与约定不一致，无法安全导出。')
                continue
            if any(values):
                rows.append((row_number, values))
        return rows

def convert(workbook, base):
    result = copy.deepcopy(base)
    theme_ids = {t['name']: t['id'] for t in base['themes']}
    sources = {s['id']: s for s in base['sources']}
    questions = []
    ids, titles = set(), set()
    for row_number, r in master_rows(workbook):
        def check(ok, message):
            if not ok:
                raise ValueError(f'总表第{row_number}行：{message}')
        # Review note is intentionally optional for pending/disabled rows.
        check(all(str(r[i]).strip() for i in range(22) if i not in (12, 21)), '必填字段为空。')
        check(r[0] not in ids, '题目编号重复。')
        check(r[6] not in titles, '题干重复。')
        ids.add(r[0]); titles.add(r[6])
        check(r[1] in theme_ids, '主题名称无效。')
        try:
            numeric = float(r[2]); level = int(numeric)
        except (ValueError, TypeError):
            raise ValueError(f'总表第{row_number}行：关卡必须为1—4整数。')
        check(numeric == level and 1 <= level <= 4, '关卡必须为1—4整数。')
        check(r[3] == LABELS[level-1], '四级难度与关卡不对应。')
        options = r[7:11]
        check(len(set(options)) == 4 and all(options), '四个选项须非空且互不重复。')
        check(r[11] in 'ABCD' and len(r[11]) == 1, '正确答案必须是A、B、C或D。')
        answer = 'ABCD'.index(r[11])
        # Derive the answer text from letter and options, independently of formula caches.
        correct = options[answer]
        if r[12]:
            check(r[12] == correct, '答案内容与正确选项不一致，请重新计算并保存Excel。')
        source_ids = r[14].split(';')
        check(len(set(source_ids)) == len(source_ids), '来源编号重复。')
        check(all(s in sources for s in source_ids), '来源编号不存在，请先补充并核实来源清单。')
        refs = [sources[s] for s in source_ids]
        check(r[15] == ' / '.join(s['title'] for s in refs), '来源标题与编号不一致。')
        check(r[16] == '\n'.join(s['url'] for s in refs), '来源链接与编号不一致。')
        check(r[18] in ('待业务审核','修改中','已通过','已退回'), '审核状态无效。')
        check(r[19] in ('未启用','启用'), '启用状态无效。')
        enabled = r[19] == '启用'
        check(not enabled or r[18] == '已通过', '未通过审核的题目不得启用。')
        check(not enabled or bool(r[21].strip()), '启用题目须在审核意见中记录审核人、日期和结论。')
        theme_id = theme_ids[r[1]]
        questions.append(dict(id=r[0],themeId=theme_id,themeName=r[1],levelId=f'{theme_id}-{level}',
            levelOrder=level,difficultyLevel=level,difficultyLabel=r[3],difficulty=LEGACY[level-1],
            knowledgePoint=r[4],region=r[5],title=r[6],options=options,answer=answer,
            correctOption=r[11],correctAnswer=correct,explanation=r[13],sourceIds=source_ids,
            sourceTitle=r[15],sourceUrl=r[16],evidenceType=r[17],reviewStatus=r[18],enabled=enabled,
            version=r[20],reviewNote=r[21]))
    if len(questions) != 240:
        raise ValueError(f'应为240题，实际{len(questions)}题；结构性改动需重新制作题库。')
    counts = Counter(q['levelId'] for q in questions)
    if len(counts) != 16 or any(v != 15 for v in counts.values()):
        raise ValueError('每个主题四关，每关必须保留15题。')
    result['questions'] = questions
    result['questionCount'] = len(questions)
    result['reviewStatus'] = '已通过' if all(q['reviewStatus'] == '已通过' for q in questions) else '待业务审核'
    return result

def approved_pools(data):
    pools = {}
    for level in data['levels']:
        selected = [q for q in data['questions'] if q['levelId'] == level['id']
                    and q['reviewStatus'] == '已通过' and q['enabled'] is True and q['reviewNote'].strip()]
        # A partially reviewed level cannot open a ten-question challenge.
        if len(selected) >= level['questionCount']:
            pools[level['id']] = selected
    return pools

def main():
    parser = argparse.ArgumentParser(description='从题库总表导出JSON，不修改游戏工程。')
    parser.add_argument('--workbook',type=Path,default=ROOT/'湖南乡村知识题库240题.xlsx')
    parser.add_argument('--base',type=Path,default=ROOT/'湖南乡村知识题库240题.json')
    parser.add_argument('--output',type=Path,default=ROOT/'湖南乡村知识题库240题_重新导出.json')
    parser.add_argument('--approved-pools',type=Path,help='可选：另存仅含已通过且启用题的关卡题池；不足10题的关卡不输出。')
    args = parser.parse_args()
    data = convert(args.workbook,json.loads(args.base.read_text(encoding='utf-8')))
    args.output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'已导出{len(data["questions"])}题：{args.output}')
    if args.approved_pools:
        pools = approved_pools(data)
        args.approved_pools.write_text(json.dumps(pools,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(f'可启用关卡{len(pools)}个，题目{sum(map(len,pools.values()))}道：{args.approved_pools}')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, StopIteration, OSError, zipfile.BadZipFile) as error:
        raise SystemExit(f'导出失败：{error}')
