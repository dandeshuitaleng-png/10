from pathlib import Path
root=Path(__file__).resolve().parents[1]/'miniprogram/assets'
base='''<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="540" viewBox="0 0 1000 540">
<rect width="1000" height="540" fill="{paper}"/>
<circle cx="796" cy="106" r="43" fill="{sun}" opacity=".65"/>
<path d="M0 290 Q80 239 160 268 Q250 120 358 244 Q433 155 511 203 Q631 45 748 220 Q851 154 1000 248 V540 H0Z" fill="{far}"/>
<path d="M0 370 Q130 176 270 340 Q347 257 430 338 Q540 125 694 342 Q820 233 1000 339 V540 H0Z" fill="{mid}" opacity=".8"/>
<path d="M0 433 Q246 324 474 417 Q766 342 1000 406 V540 H0Z" fill="{field}"/>
<path d="M523 383 Q442 423 602 457 Q731 486 593 540 H706 Q815 484 663 445 Q538 412 601 389Z" fill="{river}"/>
<g fill="{wall}" stroke="{roof}" stroke-width="3">
<path d="M185 366 H337 V461 H185Z"/><path d="M176 367 L260 321 L345 367Z" fill="{roof}"/>
<path d="M305 392 H433 V473 H305Z"/><path d="M295 393 L370 352 L442 393Z" fill="{roof}"/>
<path d="M214 390 H237 V420 H214Z M276 390 H300 V420 H276Z M344 413 H363 V439 H344Z" fill="{window}"/>
<path d="M250 412 H274 V461 H250Z M382 432 H407 V473 H382Z" fill="{window}"/>
</g>
<g fill="none" stroke="{line}" stroke-width="2" opacity=".5">
<path d="M0 487 Q206 407 448 484 M0 507 Q213 434 450 510 M754 460 Q887 408 1000 466 M781 486 Q891 453 1000 494"/>
</g><g fill="{tree}"><path d="M90 431 L126 347 L162 431Z M79 414 L126 308 L174 414Z"/><rect x="122" y="414" width="9" height="61"/><path d="M887 434 L921 347 L956 434Z M876 412 L921 301 L967 412Z"/><rect x="917" y="415" width="8" height="57"/></g>
<g fill="none" stroke="{roof}" stroke-width="2" opacity=".7"><path d="M536 143 q10 -12 20 0 q10 -12 20 0 M615 115 q7 -8 14 0 q7 -8 14 0"/></g>
</svg>'''
palettes={
'landscape':dict(paper='#F7F3E9',sun='#D7BC84',far='#D9E2D6',mid='#9BB6A3',field='#C5D1AA',river='#E8EBE0',wall='#F2EAD8',roof='#536E5C',window='#9AAA91',line='#80916B',tree='#668772'),
'red':dict(paper='#F4E9DC',sun='#CB9585',far='#DFCEBC',mid='#B8ADA0',field='#D3BEA3',river='#EFE5D4',wall='#EEE0C6',roof='#9A5147',window='#B78266',line='#AC8C64',tree='#927666'),
'history':dict(paper='#F2EBD9',sun='#C8AE74',far='#E0D8C0',mid='#B5AD8C',field='#C7BE9B',river='#EDE8D5',wall='#EFE2C4',roof='#7F7152',window='#AC9266',line='#A89972',tree='#8C926D'),
'industry':dict(paper='#F4EDDC',sun='#DDB36A',far='#E0D8B4',mid='#BFB78E',field='#D6BF78',river='#ECE9D5',wall='#F5E8CA',roof='#816A45',window='#B19258',line='#AB8E51',tree='#909568'),
'ecology':dict(paper='#ECF1E6',sun='#CFCAA0',far='#CDDDD0',mid='#90AD99',field='#B0C7A4',river='#D9E6DB',wall='#EBEBD8',roof='#47695A',window='#839D85',line='#6E9B80',tree='#52836C')}
for name,p in palettes.items(): (root/(name+'.svg')).write_text(base.format(**p))
