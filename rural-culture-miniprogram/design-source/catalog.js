/* 作者目录；构建时按 gameId 裁切。样题待业务审核。 */
window.PROTOTYPE_CONFIG = {
  "name": "趣味闯关",
  "subtitle": "乡村文化知识探索",
  "timerSeconds": 30,
  "reviveLimit": 1,
  "themeNamesSource": "现有工程目录",
  "questionApproval": "演示样题，待业务审核",
  "themes": [
    {
      "id": "red",
      "name": "十步芳草",
      "order": 1,
      "enabled": true,
      "description": "走近乡村里的红色记忆",
      "certificateName": "红色故事通"
    },
    {
      "id": "culture",
      "name": "千年文脉",
      "order": 2,
      "enabled": true,
      "description": "在乡音与古建中读懂湖南",
      "certificateName": "千年文脉知识达人"
    },
    {
      "id": "industry",
      "name": "金色产业",
      "order": 3,
      "enabled": true,
      "description": "发现一方水土的丰饶物产",
      "certificateName": "金色产业知识达人"
    },
    {
      "id": "ecology",
      "name": "青山绿水",
      "order": 4,
      "enabled": true,
      "description": "认识家乡的山川与生态",
      "certificateName": "青山绿水知识达人"
    }
  ],
  "levels": [
    {
      "id": "red-1",
      "themeId": "red",
      "order": 1,
      "label": "第1关",
      "difficultyLabel": "基础认知",
      "difficultyLevel": 1,
      "questionCount": 10,
      "poolSize": 15,
      "points": 10,
      "name": "基础认知",
      "enabled": true
    },
    {
      "id": "red-2",
      "themeId": "red",
      "order": 2,
      "label": "第2关",
      "difficultyLabel": "进阶理解",
      "difficultyLevel": 2,
      "questionCount": 10,
      "poolSize": 15,
      "points": 15,
      "name": "进阶理解",
      "enabled": true
    },
    {
      "id": "red-3",
      "themeId": "red",
      "order": 3,
      "label": "第3关",
      "difficultyLabel": "深度应用",
      "difficultyLevel": 3,
      "questionCount": 10,
      "poolSize": 15,
      "points": 20,
      "name": "深度应用",
      "enabled": true
    },
    {
      "id": "red-4",
      "themeId": "red",
      "order": 4,
      "label": "第4关",
      "difficultyLabel": "综合挑战",
      "difficultyLevel": 4,
      "questionCount": 10,
      "poolSize": 15,
      "points": 30,
      "name": "综合挑战",
      "enabled": true
    },
    {
      "id": "culture-1",
      "themeId": "culture",
      "order": 1,
      "label": "第1关",
      "difficultyLabel": "基础认知",
      "difficultyLevel": 1,
      "questionCount": 10,
      "poolSize": 15,
      "points": 10,
      "name": "基础认知",
      "enabled": true
    },
    {
      "id": "culture-2",
      "themeId": "culture",
      "order": 2,
      "label": "第2关",
      "difficultyLabel": "进阶理解",
      "difficultyLevel": 2,
      "questionCount": 10,
      "poolSize": 15,
      "points": 15,
      "name": "进阶理解",
      "enabled": true
    },
    {
      "id": "culture-3",
      "themeId": "culture",
      "order": 3,
      "label": "第3关",
      "difficultyLabel": "深度应用",
      "difficultyLevel": 3,
      "questionCount": 10,
      "poolSize": 15,
      "points": 20,
      "name": "深度应用",
      "enabled": true
    },
    {
      "id": "culture-4",
      "themeId": "culture",
      "order": 4,
      "label": "第4关",
      "difficultyLabel": "综合挑战",
      "difficultyLevel": 4,
      "questionCount": 10,
      "poolSize": 15,
      "points": 30,
      "name": "综合挑战",
      "enabled": true
    },
    {
      "id": "industry-1",
      "themeId": "industry",
      "order": 1,
      "label": "第1关",
      "difficultyLabel": "基础认知",
      "difficultyLevel": 1,
      "questionCount": 10,
      "poolSize": 15,
      "points": 10,
      "name": "基础认知",
      "enabled": true
    },
    {
      "id": "industry-2",
      "themeId": "industry",
      "order": 2,
      "label": "第2关",
      "difficultyLabel": "进阶理解",
      "difficultyLevel": 2,
      "questionCount": 10,
      "poolSize": 15,
      "points": 15,
      "name": "进阶理解",
      "enabled": true
    },
    {
      "id": "industry-3",
      "themeId": "industry",
      "order": 3,
      "label": "第3关",
      "difficultyLabel": "深度应用",
      "difficultyLevel": 3,
      "questionCount": 10,
      "poolSize": 15,
      "points": 20,
      "name": "深度应用",
      "enabled": true
    },
    {
      "id": "industry-4",
      "themeId": "industry",
      "order": 4,
      "label": "第4关",
      "difficultyLabel": "综合挑战",
      "difficultyLevel": 4,
      "questionCount": 10,
      "poolSize": 15,
      "points": 30,
      "name": "综合挑战",
      "enabled": true
    },
    {
      "id": "ecology-1",
      "themeId": "ecology",
      "order": 1,
      "label": "第1关",
      "difficultyLabel": "基础认知",
      "difficultyLevel": 1,
      "questionCount": 10,
      "poolSize": 15,
      "points": 10,
      "name": "基础认知",
      "enabled": true
    },
    {
      "id": "ecology-2",
      "themeId": "ecology",
      "order": 2,
      "label": "第2关",
      "difficultyLabel": "进阶理解",
      "difficultyLevel": 2,
      "questionCount": 10,
      "poolSize": 15,
      "points": 15,
      "name": "进阶理解",
      "enabled": true
    },
    {
      "id": "ecology-3",
      "themeId": "ecology",
      "order": 3,
      "label": "第3关",
      "difficultyLabel": "深度应用",
      "difficultyLevel": 3,
      "questionCount": 10,
      "poolSize": 15,
      "points": 20,
      "name": "深度应用",
      "enabled": true
    },
    {
      "id": "ecology-4",
      "themeId": "ecology",
      "order": 4,
      "label": "第4关",
      "difficultyLabel": "综合挑战",
      "difficultyLevel": 4,
      "questionCount": 10,
      "poolSize": 15,
      "points": 30,
      "name": "综合挑战",
      "enabled": true
    }
  ],
  "questions": [
    {
      "id": "HN-RED-1-01",
      "themeId": "red",
      "levelId": "red-1",
      "title": "“半条被子”故事发生在湖南哪个村庄？",
      "options": [
        "韶山市韶山村",
        "花垣县十八洞村",
        "通道县皇都村",
        "汝城县沙洲村"
      ],
      "answer": 3,
      "explanation": "沙洲村是故事发生地，位于郴州汝城。",
      "sourceTitle": "半条被子折射军民鱼水情",
      "sourceUrl": "https://www.hunan.gov.cn/topic/zl7sn/JZZZCZL/201906/t20190629_5368678.html"
    },
    {
      "id": "HN-RED-1-02",
      "themeId": "red",
      "levelId": "red-1",
      "title": "“半条被子”故事中，获赠被子的村民是谁？",
      "options": [
        "雷明光",
        "徐解秀",
        "滕子京",
        "蔡和森"
      ],
      "answer": 1,
      "explanation": "三位女红军借宿徐解秀家中，离开时留下半条被子。",
      "sourceTitle": "半条被子折射军民鱼水情",
      "sourceUrl": "https://www.hunan.gov.cn/topic/zl7sn/JZZZCZL/201906/t20190629_5368678.html"
    },
    {
      "id": "HN-RED-1-03",
      "themeId": "red",
      "levelId": "red-1",
      "title": "通道转兵与哪一段历史直接相关？",
      "options": [
        "秦代县政",
        "宋代书院教育",
        "明清商业贸易",
        "红军长征"
      ],
      "answer": 3,
      "explanation": "通道会议发生在中央红军长征途中。",
      "sourceTitle": "通道转兵纪念馆",
      "sourceUrl": "https://whhlyt.hunan.gov.cn/whhlyt/ggwh/201503/t20150323_5430746.html"
    },
    {
      "id": "HN-RED-1-04",
      "themeId": "red",
      "levelId": "red-1",
      "title": "平江起义发生在哪一年？",
      "options": [
        "1945年",
        "1934年",
        "1928年",
        "1915年"
      ],
      "answer": 2,
      "explanation": "平江起义发生于1928年7月。",
      "sourceTitle": "平江起义纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210826_20401057.html"
    },
    {
      "id": "HN-RED-1-05",
      "themeId": "red",
      "levelId": "red-1",
      "title": "芷江受降旧址主要见证了哪一历史主题？",
      "options": [
        "里耶秦简出土",
        "紫鹊界梯田开垦",
        "岳麓书院创办",
        "中国人民抗日战争胜利"
      ],
      "answer": 3,
      "explanation": "芷江受降旧址与抗战胜利历史直接相关。",
      "sourceTitle": "芷江受降旧址和纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101485/202108/t20210827_20401962.html"
    },
    {
      "id": "HN-RED-1-06",
      "themeId": "red",
      "levelId": "red-1",
      "title": "贺龙故居所在的湖南县份是哪里？",
      "options": [
        "安化县",
        "祁东县",
        "江永县",
        "桑植县"
      ],
      "answer": 3,
      "explanation": "贺龙故居与纪念馆位于张家界桑植。",
      "sourceTitle": "贺龙故居和纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101486/202108/t20210827_20401993.html"
    },
    {
      "id": "HN-RED-1-07",
      "themeId": "red",
      "levelId": "red-1",
      "title": "湘潭县乌石镇的纪念馆主要纪念谁？",
      "options": [
        "沈从文",
        "陶渊明",
        "彭德怀",
        "屈原"
      ],
      "answer": 2,
      "explanation": "乌石镇有彭德怀故居和纪念馆。",
      "sourceTitle": "彭德怀纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101476/202108/t20210827_20401941.html"
    },
    {
      "id": "HN-RED-1-08",
      "themeId": "red",
      "levelId": "red-1",
      "title": "蔡和森纪念馆位于哪个县？",
      "options": [
        "双峰县",
        "石门县",
        "新宁县",
        "桂东县"
      ],
      "answer": 0,
      "explanation": "蔡和森纪念馆位于娄底市双峰县。",
      "sourceTitle": "蔡和森纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101483/202108/t20210827_20403600.html"
    },
    {
      "id": "HN-RED-1-09",
      "themeId": "red",
      "levelId": "red-1",
      "title": "雷锋写给三叔雷明光的家书属于哪类资料？",
      "options": [
        "土地分配清册",
        "个人书信",
        "茶叶加工记录",
        "制瓷工艺单"
      ],
      "answer": 1,
      "explanation": "家书记录私人交流，属于书信类历史资料。",
      "sourceTitle": "湖南雷锋纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hslv/c101474/202108/t20210827_20403366.html"
    },
    {
      "id": "HN-RED-1-10",
      "themeId": "red",
      "levelId": "red-1",
      "title": "桂东沙田与早期颁布的哪套军规相关？",
      "options": [
        "弟子规",
        "三字经",
        "三大纪律六项注意",
        "千字文"
      ],
      "answer": 2,
      "explanation": "沙田与三大纪律六项注意颁布历史有关，后发展为八项注意。",
      "sourceTitle": "桂东：传承红色基因打造纪律文化品牌",
      "sourceUrl": "https://www.sxfj.gov.cn/gong_zuo_dong_tai/yi_xian_kuai_bao/10945272.shtml"
    },
    {
      "id": "HN-RED-2-01",
      "themeId": "red",
      "levelId": "red-2",
      "title": "女红军把仅有的被子分给村民，最能体现什么？",
      "options": [
        "在困难中关心群众",
        "把乡亲当作交易客户",
        "只在物资充足时提供帮助",
        "按物品价格决定帮助对象"
      ],
      "answer": 0,
      "explanation": "赠被行动发生在自身也困难的情况下，体现军民关怀。",
      "sourceTitle": "半条被子折射军民鱼水情",
      "sourceUrl": "https://www.hunan.gov.cn/topic/zl7sn/JZZZCZL/201906/t20190629_5368678.html"
    },
    {
      "id": "HN-RED-2-02",
      "themeId": "red",
      "levelId": "red-2",
      "title": "通道会议讨论改变行军方向，说明路线安排应关注什么？",
      "options": [
        "队伍出发时的口号",
        "地图绘制的颜色",
        "纪念馆今天的规模",
        "实际形势与队伍安全"
      ],
      "answer": 3,
      "explanation": "转兵是应对当时形势的行动，不能只看原有计划。",
      "sourceTitle": "通道转兵纪念馆",
      "sourceUrl": "https://whhlyt.hunan.gov.cn/whhlyt/ggwh/201503/t20150323_5430746.html"
    },
    {
      "id": "HN-RED-2-03",
      "themeId": "red",
      "levelId": "red-2",
      "title": "平江纪念馆的分耕册详细记载农民所得土地，最适合研究什么？",
      "options": [
        "候鸟迁徙路线",
        "地方戏曲唱腔",
        "土地分配情况",
        "陶瓷烧制温度"
      ],
      "answer": 2,
      "explanation": "分耕册的内容直接对应土地分配与耕作记录。",
      "sourceTitle": "平江起义纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210826_20401057.html"
    },
    {
      "id": "HN-RED-2-04",
      "themeId": "red",
      "levelId": "red-2",
      "title": "参观芷江受降旧址，最贴合展览主题的学习目标是什么？",
      "options": [
        "学习秦代县城布局",
        "理解胜利来之不易并珍惜和平",
        "寻找茶树栽培技巧",
        "比较书院教学方法"
      ],
      "answer": 1,
      "explanation": "抗战胜利纪念地引导人们认识历史和珍惜和平。",
      "sourceTitle": "芷江受降旧址和纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101485/202108/t20210827_20401962.html"
    },
    {
      "id": "HN-RED-2-05",
      "themeId": "red",
      "levelId": "red-2",
      "title": "同学同时参观贺龙故居和生平展，怎样组合记录更合适？",
      "options": [
        "分别记录生活环境与生平经历",
        "把现代展柜写成当年家具",
        "把所有房间都当作战场",
        "只记录商店商品价格"
      ],
      "answer": 0,
      "explanation": "故居空间和生平展的信息类型不同，分类记录更清楚。",
      "sourceTitle": "贺龙故居和纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101486/202108/t20210827_20401993.html"
    },
    {
      "id": "HN-RED-2-06",
      "themeId": "red",
      "levelId": "red-2",
      "title": "准备到乌石镇参观彭德怀纪念馆，哪一问题最切合主题？",
      "options": [
        "他的生平经历怎样与时代相连",
        "女书怎样写在扇面上",
        "丹霞岩壁为何呈红色",
        "黑茶为什么压成茶砖"
      ],
      "answer": 0,
      "explanation": "人物纪念馆适合围绕人物经历及时代背景开展学习。",
      "sourceTitle": "彭德怀纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101476/202108/t20210827_20401941.html"
    },
    {
      "id": "HN-RED-2-07",
      "themeId": "red",
      "levelId": "red-2",
      "title": "蔡和森展览中同时有实物和文献，这样陈列有什么作用？",
      "options": [
        "证明展品越大越真实",
        "使每件展品都变成原件",
        "从不同材料了解人物经历",
        "让所有记载自动没有差异"
      ],
      "answer": 2,
      "explanation": "不同类型材料可提供不同信息，需要结合阅读。",
      "sourceTitle": "蔡和森纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101483/202108/t20210827_20403600.html"
    },
    {
      "id": "HN-RED-2-08",
      "themeId": "red",
      "levelId": "red-2",
      "title": "阅读雷锋家书时，哪种记录最接近资料本身？",
      "options": [
        "先把书信改写为旅游广告",
        "只统计纸张面积不读内容",
        "根据字迹猜出所有人生经历",
        "记下写信对象、时间和表达内容"
      ],
      "answer": 3,
      "explanation": "对象、时间和内容是理解书信资料的基本线索。",
      "sourceTitle": "湖南雷锋纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hslv/c101474/202108/t20210827_20403366.html"
    },
    {
      "id": "HN-RED-2-09",
      "themeId": "red",
      "levelId": "red-2",
      "title": "资料说“六项注意”后来发展为“八项注意”，应怎样理解？",
      "options": [
        "纪律要求经历了发展完善",
        "后来的名称能代替所有早期名称",
        "条数越多就能确定年代越早",
        "两种名称一定互相否定"
      ],
      "answer": 0,
      "explanation": "理解沿革要保留不同时期的名称和背景。",
      "sourceTitle": "桂东：传承红色基因打造纪律文化品牌",
      "sourceUrl": "https://www.sxfj.gov.cn/gong_zuo_dong_tai/yi_xian_kuai_bao/10945272.shtml"
    },
    {
      "id": "HN-RED-2-10",
      "themeId": "red",
      "levelId": "red-2",
      "title": "茶陵旧址原为州县衙门，后来用于工农兵政府。它说明什么？",
      "options": [
        "旧建筑只能用于居住",
        "建筑外观能证明功能从未改变",
        "同一建筑可能在不同时期承担不同功能",
        "现有展览就是南宋时的原陈列"
      ],
      "answer": 2,
      "explanation": "建筑的用途需结合各阶段史料判断。",
      "sourceTitle": "茶陵县工农兵政府旧址",
      "sourceUrl": "https://searchs.hunan.gov.cn/hnszf/jxxx/hslv/c101475/202108/t20210827_20404519.html"
    },
    {
      "id": "HN-RED-3-01",
      "themeId": "red",
      "levelId": "red-3",
      "title": "一段沙洲短剧新增了人物对白，节目单怎样标注最准确？",
      "options": [
        "把对白标成当年逐字记录",
        "用现代演员姓名替换历史人物",
        "只要对白感人就不说明来源",
        "注明对白为创作，史实另列来源"
      ],
      "answer": 3,
      "explanation": "新增对白是艺术改编，须与已核实的故事事实区分。",
      "sourceTitle": "半条被子折射军民鱼水情",
      "sourceUrl": "https://www.hunan.gov.cn/topic/zl7sn/JZZZCZL/201906/t20190629_5368678.html"
    },
    {
      "id": "HN-RED-3-02",
      "themeId": "red",
      "levelId": "red-3",
      "title": "资料写通道会议在长征中调整路线。哪句话超出了这条资料的依据？",
      "options": [
        "讨论需要考虑当时局势",
        "会议与转兵之间存在联系",
        "仅凭这次调整就能解释长征全部胜利",
        "路线决策发生在长征途中"
      ],
      "answer": 2,
      "explanation": "一个事件不能单独解释复杂历史的全部结果。",
      "sourceTitle": "通道转兵纪念馆",
      "sourceUrl": "https://whhlyt.hunan.gov.cn/whhlyt/ggwh/201503/t20150323_5430746.html"
    },
    {
      "id": "HN-RED-3-03",
      "themeId": "red",
      "levelId": "red-3",
      "title": "一页分耕册只记录某乡土地分配。哪一结论最稳妥？",
      "options": [
        "能确定所有农民的个人想法",
        "能推出当地今天的地价",
        "可研究该页涉及的分配情况",
        "能代表全国每户分田数量"
      ],
      "answer": 2,
      "explanation": "资料有时空范围，不能直接推广到全国或今天。",
      "sourceTitle": "平江起义纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210826_20401057.html"
    },
    {
      "id": "HN-RED-3-04",
      "themeId": "red",
      "levelId": "red-3",
      "title": "芷江受降史事发生于1945年，纪念坊建于1946年。哪一判断正确？",
      "options": [
        "事件时间与纪念建筑建造时间不同",
        "建筑较晚说明事件是后来虚构的",
        "没有同年建坊就没有该事件",
        "纪念坊建成日就是受降发生日"
      ],
      "answer": 0,
      "explanation": "后建纪念设施可以纪念先前事件，应区分两个时间。",
      "sourceTitle": "芷江受降旧址和纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101485/202108/t20210827_20401962.html"
    },
    {
      "id": "HN-RED-3-05",
      "themeId": "red",
      "levelId": "red-3",
      "title": "贺龙展览把一件用品标为“复制品”。研学笔记应怎样写？",
      "options": [
        "去掉标注后写成原件",
        "按展柜位置判断它一定是真迹",
        "记录为复制品，并说明对应历史物品",
        "因非原件就断定人物没有使用过同类物品"
      ],
      "answer": 2,
      "explanation": "复制品有展示作用，但不能当作原件证据。",
      "sourceTitle": "贺龙故居和纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101486/202108/t20210827_20401993.html"
    },
    {
      "id": "HN-RED-3-06",
      "themeId": "red",
      "levelId": "red-3",
      "title": "彭德怀展览中，哪种材料最适合核对某封信的原文？",
      "options": [
        "游客写的抒情感想",
        "标明出处的书信原件或可靠影印件",
        "商店包装上的人物画像",
        "没有出处的网络台词"
      ],
      "answer": 1,
      "explanation": "核对原文应优先使用与信件直接相关且出处清楚的材料。",
      "sourceTitle": "彭德怀纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101476/202108/t20210827_20401941.html"
    },
    {
      "id": "HN-RED-3-07",
      "themeId": "red",
      "levelId": "red-3",
      "title": "同学把蔡和森和蔡畅的展品信息混写在一栏，首先应怎样纠正？",
      "options": [
        "按人物姓名和展签逐件核对",
        "只删除难读的展品标题",
        "把同姓人物经历全部合并",
        "按照片大小给人物重新命名"
      ],
      "answer": 0,
      "explanation": "共同展览不等于人物经历相同，须逐件确认归属。",
      "sourceTitle": "蔡和森纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101483/202108/t20210827_20403600.html"
    },
    {
      "id": "HN-RED-3-08",
      "themeId": "red",
      "levelId": "red-3",
      "title": "仅凭雷锋写给亲人的一封家书，能直接确定哪项内容？",
      "options": [
        "其一生每一天的行程",
        "所有未保存家书的内容",
        "所有亲人当时的想法",
        "这封信中明确写出的信息"
      ],
      "answer": 3,
      "explanation": "书信支持其中的具体表达，无法填补全部未知经历。",
      "sourceTitle": "湖南雷锋纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hslv/c101474/202108/t20210827_20403366.html"
    },
    {
      "id": "HN-RED-3-09",
      "themeId": "red",
      "levelId": "red-3",
      "title": "讲解稿把1928年桂东沙田的早期军规直接写成“六项从未出现”。怎样改？",
      "options": [
        "只列后期名称而不解释早期文本",
        "说明早期六项及后续八项的沿革",
        "删掉年代并保留绝对说法",
        "用景区宣传口号代替具体史实"
      ],
      "answer": 1,
      "explanation": "应保留制度发展的阶段，避免把后来名称倒置到早期。",
      "sourceTitle": "桂东：传承红色基因打造纪律文化品牌 / 传承军规精神锻造红色警队",
      "sourceUrl": "https://www.sxfj.gov.cn/gong_zuo_dong_tai/yi_xian_kuai_bao/10945272.shtml\nhttps://www.hnzf.gov.cn/content/646846/65/13547611.html"
    },
    {
      "id": "HN-RED-3-10",
      "themeId": "red",
      "levelId": "red-3",
      "title": "要研究茶陵旧址某时期的用途，哪组证据最直接？",
      "options": [
        "游客服装、门票颜色与天气",
        "同期文献、展签说明与建筑使用记录",
        "现代装修广告和地图配色",
        "附近餐饮评分和停车数量"
      ],
      "answer": 1,
      "explanation": "建筑用途的判断需使用与该时期功能相关的材料。",
      "sourceTitle": "茶陵县工农兵政府旧址",
      "sourceUrl": "https://searchs.hunan.gov.cn/hnszf/jxxx/hslv/c101475/202108/t20210827_20404519.html"
    },
    {
      "id": "HN-RED-4-01",
      "themeId": "red",
      "levelId": "red-4",
      "title": "沙洲班级展要求“史实可追溯、改编可识别”。哪套方案同时满足？",
      "options": [
        "列史实来源，给创作对白加说明",
        "只注明演员姓名，不列故事出处",
        "只展示现代被子，不说明历史联系",
        "列资料出处，但把新对白称为原话"
      ],
      "answer": 0,
      "explanation": "出处说明支持核查，改编标注防止把创作误认成史料。",
      "sourceTitle": "半条被子折射军民鱼水情",
      "sourceUrl": "https://www.hunan.gov.cn/topic/zl7sn/JZZZCZL/201906/t20190629_5368678.html"
    },
    {
      "id": "HN-RED-4-02",
      "themeId": "red",
      "levelId": "red-4",
      "title": "资料给出平江起义1928年、通道会议1934年、芷江受降史事1945年。正确先后是？",
      "options": [
        "通道会议→平江起义→芷江受降",
        "平江起义→通道会议→芷江受降",
        "平江起义→芷江受降→通道会议",
        "芷江受降→平江起义→通道会议"
      ],
      "answer": 1,
      "explanation": "按1928、1934、1945的时间顺序排列。",
      "sourceTitle": "通道转兵纪念馆 / 平江起义纪念馆 / 芷江受降旧址和纪念馆",
      "sourceUrl": "https://whhlyt.hunan.gov.cn/whhlyt/ggwh/201503/t20150323_5430746.html\nhttps://www.hunan.gov.cn/hnszf/c101480/202108/t20210826_20401057.html\nhttps://www.hunan.gov.cn/hnszf/c101485/202108/t20210827_20401962.html"
    },
    {
      "id": "HN-RED-4-03",
      "themeId": "red",
      "levelId": "red-4",
      "title": "小组读到三户的分耕册，想推算全县分田。哪一步能减少以偏概全？",
      "options": [
        "只保留田地最多的那户",
        "用今天住宅面积替代历史田亩",
        "把三户平均数直接当全县平均数",
        "先查样本范围，再补充不同乡的记录"
      ],
      "answer": 3,
      "explanation": "先确认样本是否具有代表性，再考虑扩大资料范围。",
      "sourceTitle": "平江起义纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210826_20401057.html"
    },
    {
      "id": "HN-RED-4-04",
      "themeId": "red",
      "levelId": "red-4",
      "title": "展牌须同时说明1945年史事与1946年建坊。哪种写法最准确？",
      "options": [
        "把1946年写为事件与建坊共同时间",
        "只注明1946年，称建筑比事件更可靠",
        "分别注明1945年史事与1946年建坊",
        "把1945年写为事件与建坊共同时间"
      ],
      "answer": 2,
      "explanation": "分栏能清楚呈现纪念对象与纪念设施的时间关系。",
      "sourceTitle": "芷江受降旧址和纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101485/202108/t20210827_20401962.html"
    },
    {
      "id": "HN-RED-4-05",
      "themeId": "red",
      "levelId": "red-4",
      "title": "研学目标是“贺龙家乡与湘鄂川黔根据地”。哪组地点组合最贴合？",
      "options": [
        "桑植贺龙故居与永顺塔卧",
        "安化茶园与醴陵瓷器展",
        "新宁崀山与资兴东江湖",
        "汨罗屈子祠与江永女书馆"
      ],
      "answer": 0,
      "explanation": "桑植对应人物家乡，塔卧对应相关革命根据地。",
      "sourceTitle": "贺龙故居和纪念馆 / 湘鄂川黔革命根据地纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101486/202108/t20210827_20401993.html\nhttps://www.hunan.gov.cn/hnszf/c101487/202108/t20210826_20401083.html"
    },
    {
      "id": "HN-RED-4-06",
      "themeId": "red",
      "levelId": "red-4",
      "title": "乌石研学稿有姓名、地点、原创对白三类信息。哪种审核顺序更稳妥？",
      "options": [
        "因地点正确而免查全部对白",
        "核对人物地点，再标注对白为改编",
        "以对白是否押韵决定史实真假",
        "先删来源，再使稿件更简短"
      ],
      "answer": 1,
      "explanation": "基础事实和改编身份都需核查，不能相互替代。",
      "sourceTitle": "彭德怀纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101476/202108/t20210827_20401941.html"
    },
    {
      "id": "HN-RED-4-07",
      "themeId": "red",
      "levelId": "red-4",
      "title": "联合展同时展蔡和森文献与里耶秦简，怎样避免时代混淆？",
      "options": [
        "只按书写载体分类，不记录历史背景",
        "分设近现代人物与秦代文书单元",
        "按今天入藏先后代替资料产生的年代",
        "按“湖南文献”合并并省略年代说明"
      ],
      "answer": 1,
      "explanation": "资料材质和入藏时间不能决定时代，应按背景与用途分类。",
      "sourceTitle": "蔡和森纪念馆 / 里耶秦简出土二十周年座谈会",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101483/202108/t20210827_20403600.html\nhttps://wwj.hunan.gov.cn/wwj/c100310/c100311/202206/t20220624_26402639.html"
    },
    {
      "id": "HN-RED-4-08",
      "themeId": "red",
      "levelId": "red-4",
      "title": "一封家书有写信日期和入藏日期。建表时怎样保留两类信息？",
      "options": [
        "按展出日期排序后不再记录原日期",
        "只取较早日期，并称两日期可互换",
        "统一以入藏日期表示文物产生日期",
        "设独立字段，分别记录其含义"
      ],
      "answer": 3,
      "explanation": "写作、入藏与展出发生在不同阶段，分别记录便于追溯。",
      "sourceTitle": "湖南雷锋纪念馆",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hslv/c101474/202108/t20210827_20403366.html"
    },
    {
      "id": "HN-RED-4-09",
      "themeId": "red",
      "levelId": "red-4",
      "title": "小组找到“六项注意”早期说明和“八项注意”后期说明，最佳结论是？",
      "options": [
        "后期条数多，所以早期资料必假",
        "先核对时间与文本，解释纪律的发展",
        "同属纪律教育，任意互换都准确",
        "早期名称出现过，所以后期必假"
      ],
      "answer": 1,
      "explanation": "不同版本可能对应不同阶段，应先核对年代和内容。",
      "sourceTitle": "桂东：传承红色基因打造纪律文化品牌",
      "sourceUrl": "https://www.sxfj.gov.cn/gong_zuo_dong_tai/yi_xian_kuai_bao/10945272.shtml"
    },
    {
      "id": "HN-RED-4-10",
      "themeId": "red",
      "levelId": "red-4",
      "title": "茶陵旧址有旧衙门历史和红色政权历史，哪套展线最清楚？",
      "options": [
        "按阶段说明用途，并标明资料来源",
        "合并两段历史，但取消阶段与年代提示",
        "只讲建筑风格，推断所有时期用途相同",
        "只讲现有展陈，把当前展柜视为旧陈设"
      ],
      "answer": 0,
      "explanation": "分时期解释能呈现建筑承载的历史变化。",
      "sourceTitle": "茶陵县工农兵政府旧址",
      "sourceUrl": "https://searchs.hunan.gov.cn/hnszf/jxxx/hslv/c101475/202108/t20210827_20404519.html"
    },
    {
      "id": "HN-CULTURE-1-01",
      "themeId": "culture",
      "levelId": "culture-1",
      "title": "岳麓书院位于湖南哪座城市？",
      "options": [
        "郴州",
        "怀化",
        "长沙",
        "邵阳"
      ],
      "answer": 2,
      "explanation": "岳麓书院位于长沙岳麓山麓。",
      "sourceTitle": "岳麓书院",
      "sourceUrl": "https://hunan.gov.cn/hnszf/c101474/202108/t20210827_20403698.html"
    },
    {
      "id": "HN-CULTURE-1-02",
      "themeId": "culture",
      "levelId": "culture-1",
      "title": "岳麓书院创建于公元976年，属于哪个朝代？",
      "options": [
        "清朝",
        "秦朝",
        "唐朝",
        "北宋"
      ],
      "answer": 3,
      "explanation": "976年为北宋时期，书院至今延续教育与研究传统。",
      "sourceTitle": "岳麓书院",
      "sourceUrl": "https://hunan.gov.cn/hnszf/c101474/202108/t20210827_20403698.html"
    },
    {
      "id": "HN-CULTURE-1-03",
      "themeId": "culture",
      "levelId": "culture-1",
      "title": "《岳阳楼记》的作者是谁？",
      "options": [
        "屈原",
        "陶渊明",
        "范仲淹",
        "沈从文"
      ],
      "answer": 2,
      "explanation": "范仲淹的岳阳楼记使岳阳楼更加闻名。",
      "sourceTitle": "岳阳楼",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210830_20411802.html"
    },
    {
      "id": "HN-CULTURE-1-04",
      "themeId": "culture",
      "levelId": "culture-1",
      "title": "女书习俗主要与湖南哪个县相关？",
      "options": [
        "安化县",
        "桑植县",
        "江永县",
        "平江县"
      ],
      "answer": 2,
      "explanation": "江永女书是永州江永的重要文化遗产。",
      "sourceTitle": "江永女书习俗",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hxwh/gms/201711/t20171111_4685337.html"
    },
    {
      "id": "HN-CULTURE-1-05",
      "themeId": "culture",
      "levelId": "culture-1",
      "title": "滩头木版年画的代表产地是哪里？",
      "options": [
        "桂东县沙田镇",
        "隆回县滩头镇",
        "龙山县里耶镇",
        "湘潭县乌石镇"
      ],
      "answer": 1,
      "explanation": "滩头位于邵阳隆回，木版年画是当地传统美术。",
      "sourceTitle": "滩头木版年画",
      "sourceUrl": "https://www.ihchina.cn/art/detail/id/13907.html"
    },
    {
      "id": "HN-CULTURE-1-06",
      "themeId": "culture",
      "levelId": "culture-1",
      "title": "“西兰卡普”通常指哪类传统物品？",
      "options": [
        "土家织锦被面",
        "滩头木版年画",
        "醴陵彩绘瓷瓶",
        "安化黑茶茶砖"
      ],
      "answer": 0,
      "explanation": "西兰卡普是土家织锦中具有代表性的被面。",
      "sourceTitle": "土家族织锦技艺",
      "sourceUrl": "https://www.ihchina.cn/Article/Index/detail?id=14282"
    },
    {
      "id": "HN-CULTURE-1-07",
      "themeId": "culture",
      "levelId": "culture-1",
      "title": "里耶秦简主要记录哪个朝代的县政与社会生活？",
      "options": [
        "明朝",
        "北宋",
        "清朝",
        "秦朝"
      ],
      "answer": 3,
      "explanation": "秦简保存了秦代迁陵县的行政和生活信息。",
      "sourceTitle": "里耶秦简出土二十周年座谈会",
      "sourceUrl": "https://wwj.hunan.gov.cn/wwj/c100310/c100311/202206/t20220624_26402639.html"
    },
    {
      "id": "HN-CULTURE-1-08",
      "themeId": "culture",
      "levelId": "culture-1",
      "title": "汨罗屈子祠主要纪念谁？",
      "options": [
        "屈原",
        "蔡和森",
        "范仲淹",
        "贺龙"
      ],
      "answer": 0,
      "explanation": "屈子祠为纪念诗人屈原而建。",
      "sourceTitle": "屈子祠",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210827_20403356.html"
    },
    {
      "id": "HN-CULTURE-1-09",
      "themeId": "culture",
      "levelId": "culture-1",
      "title": "湖南桃花源文化与哪位作家的作品密切相关？",
      "options": [
        "沈从文",
        "范仲淹",
        "陶渊明",
        "雷锋"
      ],
      "answer": 2,
      "explanation": "桃花源文化与陶渊明的桃花源记等作品相关。",
      "sourceTitle": "桃花源传说",
      "sourceUrl": "https://www.hunan.gov.cn/jxxx/hxwh/cls/201212/t20121220_4874896.html"
    },
    {
      "id": "HN-CULTURE-1-10",
      "themeId": "culture",
      "levelId": "culture-1",
      "title": "与凤凰文化联系紧密的现代作家是谁？",
      "options": [
        "蔡和森",
        "沈从文",
        "彭德怀",
        "滕子京"
      ],
      "answer": 1,
      "explanation": "凤凰是沈从文的家乡，也是理解其文学的重要地域背景。",
      "sourceTitle": "湖南凤凰",
      "sourceUrl": "https://zrzyt.hunan.gov.cn/zrzyt/xxgk/qtxx/sxfc/201703/t20170328_4166474.html"
    },
    {
      "id": "HN-CULTURE-2-01",
      "themeId": "culture",
      "levelId": "culture-2",
      "title": "“千年学府”这一称呼主要强调岳麓书院什么特点？",
      "options": [
        "所有建筑从未维修",
        "长期延续教育与学术活动",
        "馆内藏品全部有千年历史",
        "所有学生都生活在宋代"
      ],
      "answer": 1,
      "explanation": "称呼强调教育传统，不能推成每件建筑或藏品都同样古老。",
      "sourceTitle": "岳麓书院",
      "sourceUrl": "https://hunan.gov.cn/hnszf/c101474/202108/t20210827_20403698.html"
    },
    {
      "id": "HN-CULTURE-2-02",
      "themeId": "culture",
      "levelId": "culture-2",
      "title": "岳阳楼木构件通过榫合连接，最贴近哪种解释？",
      "options": [
        "依靠纸张粘出整座楼",
        "每个构件均悬空不相连",
        "先把全部木材熔化再成型",
        "利用木构件相互嵌接"
      ],
      "answer": 3,
      "explanation": "榫合利用构件之间的结构配合实现连接。",
      "sourceTitle": "岳阳楼",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210830_20411802.html"
    },
    {
      "id": "HN-CULTURE-2-03",
      "themeId": "culture",
      "levelId": "culture-2",
      "title": "女书既有书写又有唱读，学习活动怎样安排更完整？",
      "options": [
        "结合字形学习、唱读和背景讲解",
        "只比较扇子的购买价格",
        "只拍照且不记录传习方式",
        "只播放配乐而不介绍文字"
      ],
      "answer": 0,
      "explanation": "女书习俗包含书写、唱读与女性交流，需结合了解。",
      "sourceTitle": "江永女书习俗",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hxwh/gms/201711/t20171111_4685337.html"
    },
    {
      "id": "HN-CULTURE-2-04",
      "themeId": "culture",
      "levelId": "culture-2",
      "title": "为什么研究滩头年画不能只看最终图案？",
      "options": [
        "只有纸张尺寸具有文化意义",
        "任何打印图都等同完整传统制作",
        "木版、纸张和印制工艺也承载技艺",
        "只需知道商品售价就能学会工艺"
      ],
      "answer": 2,
      "explanation": "年画的工艺与材料共同形成传统美术特点。",
      "sourceTitle": "滩头木版年画",
      "sourceUrl": "https://www.ihchina.cn/art/detail/id/13907.html"
    },
    {
      "id": "HN-CULTURE-2-05",
      "themeId": "culture",
      "levelId": "culture-2",
      "title": "土家织锦与湘绣都能形成花纹，最关键的工艺区别是什么？",
      "options": [
        "织锦不能制生活用品，湘绣才可以",
        "织锦一定无颜色，湘绣一定有颜色",
        "织锦只用金属，湘绣只用木头",
        "织锦靠织造，湘绣靠针线刺绣"
      ],
      "answer": 3,
      "explanation": "纹样相似不等于工艺相同，应区分织造与刺绣。",
      "sourceTitle": "土家族织锦技艺",
      "sourceUrl": "https://www.ihchina.cn/Article/Index/detail?id=14282"
    },
    {
      "id": "HN-CULTURE-2-06",
      "themeId": "culture",
      "levelId": "culture-2",
      "title": "里耶秦简为何能帮助研究古代日常治理？",
      "options": [
        "它们能直接播放当时的视频",
        "其中保存县政文书和社会生活记录",
        "每枚简都记载帝王生平",
        "木材颜色可以替代文字内容"
      ],
      "answer": 1,
      "explanation": "县政文书提供与具体行政活动相关的历史信息。",
      "sourceTitle": "里耶秦简出土二十周年座谈会",
      "sourceUrl": "https://wwj.hunan.gov.cn/wwj/c100310/c100311/202206/t20220624_26402639.html"
    },
    {
      "id": "HN-CULTURE-2-07",
      "themeId": "culture",
      "levelId": "culture-2",
      "title": "屈子祠是纪念屈原的建筑，这意味着什么？",
      "options": [
        "它承载后人对屈原的纪念",
        "它必定是屈原亲手建成",
        "现有每块木料都出自战国",
        "它只是一处与人物无关的市场"
      ],
      "answer": 0,
      "explanation": "纪念建筑与人物居所、本人建造的建筑不是同一概念。",
      "sourceTitle": "屈子祠",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210827_20403356.html"
    },
    {
      "id": "HN-CULTURE-2-08",
      "themeId": "culture",
      "levelId": "culture-2",
      "title": "“世外桃源”作为文学意象，主要寄托了什么？",
      "options": [
        "对和平幸福生活的向往",
        "对高温烧瓷技术的说明",
        "对真实户籍登记的逐项统计",
        "对工业流水线速度的追求"
      ],
      "answer": 0,
      "explanation": "桃花源文化表达理想生活的想象，不是行政统计。",
      "sourceTitle": "桃花源传说",
      "sourceUrl": "https://www.hunan.gov.cn/jxxx/hxwh/cls/201212/t20121220_4874896.html"
    },
    {
      "id": "HN-CULTURE-2-09",
      "themeId": "culture",
      "levelId": "culture-2",
      "title": "阅读沈从文作品后参访凤凰，怎样理解二者关系？",
      "options": [
        "文学作品可以取代所有实地资料",
        "现代景点必定与书中细节完全一致",
        "作品提供文化视角，现场需独立观察",
        "小说里的每个情节都能当真实史事"
      ],
      "answer": 2,
      "explanation": "文学帮助理解地方文化，同时包含艺术创作。",
      "sourceTitle": "湖南凤凰",
      "sourceUrl": "https://zrzyt.hunan.gov.cn/zrzyt/xxgk/qtxx/sxfc/201703/t20170328_4166474.html"
    },
    {
      "id": "HN-CULTURE-2-10",
      "themeId": "culture",
      "levelId": "culture-2",
      "title": "古商城同时有商行、会馆和钱庄，这能帮助研究什么？",
      "options": [
        "丹霞岩石的化学成分",
        "红军长征的每次战斗",
        "候鸟栖息地的季节变化",
        "交易、商人交往与金融活动"
      ],
      "answer": 3,
      "explanation": "这些建筑功能与商业社会的不同活动相联系。",
      "sourceTitle": "文化地标：洪江古商城",
      "sourceUrl": "https://whhlyt.hunan.gov.cn/news/wlyw/201804/t20180424_5372612.html"
    },
    {
      "id": "HN-CULTURE-3-01",
      "themeId": "culture",
      "levelId": "culture-3",
      "title": "同学说“书院创于976年，所以眼前每栋楼都建于976年”。问题在哪里？",
      "options": [
        "把机构创建时间等同每栋建筑年代",
        "把长沙地点标在湖南境内",
        "把讲堂视为教育空间",
        "把建筑名称写成四个字"
      ],
      "answer": 0,
      "explanation": "书院经历多个时期，具体建筑年代需另查资料。",
      "sourceTitle": "岳麓书院",
      "sourceUrl": "https://hunan.gov.cn/hnszf/c101474/202108/t20210827_20403698.html"
    },
    {
      "id": "HN-CULTURE-3-02",
      "themeId": "culture",
      "levelId": "culture-3",
      "title": "解说只因《岳阳楼记》写了风景，就断定作者当时站在楼上。应怎样判断？",
      "options": [
        "建筑今天开放就证明当时亲临",
        "文章写得长就能证明亲临",
        "文字描写不足以单独证明现场经历",
        "任何风景描写都必须来自现场"
      ],
      "answer": 2,
      "explanation": "文学描写可能借助资料或想象，亲历判断需独立证据。",
      "sourceTitle": "岳阳楼",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210830_20411802.html"
    },
    {
      "id": "HN-CULTURE-3-03",
      "themeId": "culture",
      "levelId": "culture-3",
      "title": "女书有多种起源传说，但资料未确定起源时间。展板应如何写？",
      "options": [
        "用流传最广的年份作精确结论",
        "标明传说性质及起源尚待研究",
        "任取一个传说写成确定史实",
        "把传说全部改成现代人物经历"
      ],
      "answer": 1,
      "explanation": "应区分民间传说与有证据支持的历史结论。",
      "sourceTitle": "江永女书习俗",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hxwh/gms/201711/t20171111_4685337.html"
    },
    {
      "id": "HN-CULTURE-3-04",
      "themeId": "culture",
      "levelId": "culture-3",
      "title": "扫描滩头年画后用打印机输出，怎样标注商品更准确？",
      "options": [
        "未经复制的历史原画",
        "当年雕刻木版原件",
        "传统年画图像的数字复制品",
        "手工木版水印原作"
      ],
      "answer": 2,
      "explanation": "数字复制保留图像信息，却不等同传统手工印制。",
      "sourceTitle": "滩头木版年画",
      "sourceUrl": "https://www.ihchina.cn/art/detail/id/13907.html"
    },
    {
      "id": "HN-CULTURE-3-05",
      "themeId": "culture",
      "levelId": "culture-3",
      "title": "设计组借用土家织锦纹样，怎样记录有助于尊重原文化？",
      "options": [
        "用另一地区纹样名称替代",
        "记下出处、名称和传承人说明",
        "只保留颜色编号不问含义",
        "删去族群名称后称为自创"
      ],
      "answer": 1,
      "explanation": "来源与当地解释能帮助理解纹样，避免错误归属。",
      "sourceTitle": "土家族织锦技艺",
      "sourceUrl": "https://www.ihchina.cn/Article/Index/detail?id=14282"
    },
    {
      "id": "HN-CULTURE-3-06",
      "themeId": "culture",
      "levelId": "culture-3",
      "title": "一枚秦简只记录一次粮食出入，能支持哪种结论？",
      "options": [
        "该记录涉及的具体事项",
        "整个秦朝每年的粮食总量",
        "所有县城都使用同一粮价",
        "秦代每个人都从事同一职业"
      ],
      "answer": 0,
      "explanation": "单份行政记录不能直接推广到整个时代的全部情况。",
      "sourceTitle": "里耶秦简出土二十周年座谈会",
      "sourceUrl": "https://wwj.hunan.gov.cn/wwj/c100310/c100311/202206/t20220624_26402639.html"
    },
    {
      "id": "HN-CULTURE-3-07",
      "themeId": "culture",
      "levelId": "culture-3",
      "title": "资料只说屈子祠位于汨罗，能据此认定屈原出生于祠址吗？",
      "options": [
        "不能，纪念地点不能单独证明出生地点",
        "能，所有祠堂都建在出生地点",
        "不能，因为祠堂不可能纪念任何人物",
        "能，人物名称出现在建筑名中就足够"
      ],
      "answer": 0,
      "explanation": "建筑纪念对象与人物出生地属于不同事实，需要分别核查。",
      "sourceTitle": "屈子祠",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210827_20403356.html"
    },
    {
      "id": "HN-CULTURE-3-08",
      "themeId": "culture",
      "levelId": "culture-3",
      "title": "导览称“桃花源记就是今日景区的逐户调查”。应如何修正？",
      "options": [
        "按景区商店数量补齐原文",
        "说明文学作品与地方文化联系，避免当作调查表",
        "将所有传说改成户籍档案",
        "把现代门票收入当古代人口证据"
      ],
      "answer": 1,
      "explanation": "文学意象和景区文化可以相关，却不等同实证调查。",
      "sourceTitle": "桃花源传说",
      "sourceUrl": "https://www.hunan.gov.cn/jxxx/hxwh/cls/201212/t20121220_4874896.html"
    },
    {
      "id": "HN-CULTURE-3-09",
      "themeId": "culture",
      "levelId": "culture-3",
      "title": "凤凰研学只拍“同款街景”，怎样补充才能更了解地方文化？",
      "options": [
        "只统计照片点赞数",
        "记录建筑、居民生活与可靠地方资料",
        "用滤镜把每栋房屋调成同色",
        "把游客扮演直接当古代生活实录"
      ],
      "answer": 1,
      "explanation": "地方文化涉及空间、生活与历史，需结合多种信息。",
      "sourceTitle": "湖南凤凰",
      "sourceUrl": "https://zrzyt.hunan.gov.cn/zrzyt/xxgk/qtxx/sxfc/201703/t20170328_4166474.html"
    },
    {
      "id": "HN-CULTURE-3-10",
      "themeId": "culture",
      "levelId": "culture-3",
      "title": "旧钱庄现改作展馆，研究历史用途时应优先查什么？",
      "options": [
        "手机导航的界面样式",
        "游客最新的穿搭照片",
        "旧档案、展签和建筑沿革资料",
        "现在售卖纪念品的颜色"
      ],
      "answer": 2,
      "explanation": "现在的功能不必等同过去，沿革资料能帮助辨别。",
      "sourceTitle": "文化地标：洪江古商城",
      "sourceUrl": "https://whhlyt.hunan.gov.cn/news/wlyw/201804/t20180424_5372612.html"
    },
    {
      "id": "HN-CULTURE-4-01",
      "themeId": "culture",
      "levelId": "culture-4",
      "title": "展览给出“秦代县政文书”和“976年创办的书院”。哪种编排保留正确时代关系？",
      "options": [
        "秦代文书在前，书院创办在后",
        "按出土与修缮日期认定两者同代",
        "书院创办在前，秦代文书在后",
        "以今日开放日期排出两者产生年代"
      ],
      "answer": 0,
      "explanation": "题中时代信息足以判断秦代早于北宋，开放修缮时间不能替代。",
      "sourceTitle": "岳麓书院 / 里耶秦简出土二十周年座谈会",
      "sourceUrl": "https://hunan.gov.cn/hnszf/c101474/202108/t20210827_20403698.html\nhttps://wwj.hunan.gov.cn/wwj/c100310/c100311/202206/t20220624_26402639.html"
    },
    {
      "id": "HN-CULTURE-4-02",
      "themeId": "culture",
      "levelId": "culture-4",
      "title": "展览要同时讲岳阳楼木结构和岳阳楼记，哪套资料组合最合适？",
      "options": [
        "只用作品中的景物描写解释所有木构件",
        "只用今日建筑照片确定作者写作经历",
        "结构示意与作品背景各列来源",
        "只按知名度介绍作者，省略结构信息"
      ],
      "answer": 2,
      "explanation": "建筑结构和文学背景需要不同类型资料支撑。",
      "sourceTitle": "岳阳楼",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210830_20411802.html"
    },
    {
      "id": "HN-CULTURE-4-03",
      "themeId": "culture",
      "levelId": "culture-4",
      "title": "女书课程目标为“认字、唱读、了解女性交流”。哪套活动覆盖最完整？",
      "options": [
        "字形临摹、笔画比赛与字体展览",
        "背景讲解、游客访谈与景点导览",
        "唱读欣赏、歌曲演唱与声音采集",
        "背景讲解、字形练习与唱读体验"
      ],
      "answer": 3,
      "explanation": "后三组分别缺少声音、文字或操作学习，第一组覆盖三个目标。",
      "sourceTitle": "江永女书习俗",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hxwh/gms/201711/t20171111_4685337.html"
    },
    {
      "id": "HN-CULTURE-4-04",
      "themeId": "culture",
      "levelId": "culture-4",
      "title": "假设套印要用已完成的木版，成品检查须在套印后。哪种顺序符合这两项条件？",
      "options": [
        "套印→准备木版→成品检查",
        "成品检查→套印→准备木版",
        "准备木版→套印→成品检查",
        "准备木版→成品检查→套印"
      ],
      "answer": 2,
      "explanation": "套印依赖木版，成品检查依赖套印完成，按两项先后关系排序。",
      "sourceTitle": "滩头木版年画",
      "sourceUrl": "https://www.ihchina.cn/art/detail/id/13907.html"
    },
    {
      "id": "HN-CULTURE-4-05",
      "themeId": "culture",
      "levelId": "culture-4",
      "title": "展签描述甲“织机挑织纹样”，乙“在底布上用针绣图案”。正确分类是？",
      "options": [
        "甲木版印刷，乙刺绣",
        "甲织锦，乙瓷器彩绘",
        "甲织锦，乙刺绣",
        "甲刺绣，乙织锦"
      ],
      "answer": 2,
      "explanation": "区分依据是制作过程，不能只看最终图案。",
      "sourceTitle": "土家族织锦技艺 / 传统湘绣艺术遭遇价低质劣恶性竞争",
      "sourceUrl": "https://www.ihchina.cn/Article/Index/detail?id=14282\nhttps://www.ihchina.cn/news_other_details/16922.html"
    },
    {
      "id": "HN-CULTURE-4-06",
      "themeId": "culture",
      "levelId": "culture-4",
      "title": "两份秦简释文对一处残字不同，班级报告怎样处理更可靠？",
      "options": [
        "并列释读差异，核对原图和研究说明",
        "悄悄删掉差异后称已完全确定",
        "挑字数更多的版本当唯一原文",
        "按投票把残字补成最熟悉的字"
      ],
      "answer": 0,
      "explanation": "残字释读可能有分歧，应呈现依据和不确定性。",
      "sourceTitle": "里耶秦简出土二十周年座谈会",
      "sourceUrl": "https://wwj.hunan.gov.cn/wwj/c100310/c100311/202206/t20220624_26402639.html"
    },
    {
      "id": "HN-CULTURE-4-07",
      "themeId": "culture",
      "levelId": "culture-4",
      "title": "文学展要求地点与人物配对准确，哪组全部正确？",
      "options": [
        "汨罗—范仲淹，桃花源—贺龙，凤凰—雷锋",
        "汨罗—屈原，桃花源—陶渊明，凤凰—沈从文",
        "汨罗—沈从文，桃花源—屈原，凤凰—陶渊明",
        "汨罗—陶渊明，桃花源—沈从文，凤凰—屈原"
      ],
      "answer": 1,
      "explanation": "三地分别与屈原纪念、陶渊明文学和沈从文家乡文化相连。",
      "sourceTitle": "屈子祠 / 桃花源传说 / 湖南凤凰",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/c101480/202108/t20210827_20403356.html\nhttps://www.hunan.gov.cn/jxxx/hxwh/cls/201212/t20121220_4874896.html\nhttps://zrzyt.hunan.gov.cn/zrzyt/xxgk/qtxx/sxfc/201703/t20170328_4166474.html"
    },
    {
      "id": "HN-CULTURE-4-08",
      "themeId": "culture",
      "levelId": "culture-4",
      "title": "作业同时要求读桃花源记与调查今日村庄，哪种呈现符合两类资料性质？",
      "options": [
        "把采访内容直接补进古文当原文",
        "用古文全部替代村庄调查结果",
        "分列文学意象和实地观察，再比较异同",
        "把文学人物登记为今日受访者"
      ],
      "answer": 2,
      "explanation": "不同资料保持独立，再比较才能避免把想象当现实。",
      "sourceTitle": "桃花源传说",
      "sourceUrl": "https://www.hunan.gov.cn/jxxx/hxwh/cls/201212/t20121220_4874896.html"
    },
    {
      "id": "HN-CULTURE-4-09",
      "themeId": "culture",
      "levelId": "culture-4",
      "title": "小组讨论“旅游是否改变古城生活”，哪套调查更能支撑分析？",
      "options": [
        "只用小说片段推断今日全部生活",
        "只拍一张精修风景照片",
        "只数某条短视频的收藏数",
        "居民访谈、不同时间观察与历史资料对照"
      ],
      "answer": 3,
      "explanation": "变化研究需要时间比较和多种实际资料。",
      "sourceTitle": "湖南凤凰",
      "sourceUrl": "https://zrzyt.hunan.gov.cn/zrzyt/xxgk/qtxx/sxfc/201703/t20170328_4166474.html"
    },
    {
      "id": "HN-CULTURE-4-10",
      "themeId": "culture",
      "levelId": "culture-4",
      "title": "旧商行展示要求“保留原格局并解释贸易用途”。哪套方案同时符合？",
      "options": [
        "介绍贸易，只用异地建筑替换原空间",
        "介绍贸易，拆除原墙改为全新布景",
        "保留空间，只布置彩灯而不解释历史",
        "保留空间，用可移除展板说明用途"
      ],
      "answer": 3,
      "explanation": "原格局是历史线索，辅助说明可帮助理解；后三组各缺一项条件。",
      "sourceTitle": "文化地标：洪江古商城 / Tusi Sites（土司遗址）",
      "sourceUrl": "https://whhlyt.hunan.gov.cn/news/wlyw/201804/t20180424_5372612.html\nhttps://whc.unesco.org/en/list/1474/"
    },
    {
      "id": "HN-INDUSTRY-1-01",
      "themeId": "industry",
      "levelId": "industry-1",
      "title": "安化黑茶的代表产地属于湖南哪座城市？",
      "options": [
        "益阳",
        "郴州",
        "岳阳",
        "永州"
      ],
      "answer": 0,
      "explanation": "安化县属于益阳市，安化黑茶是当地特色产品。",
      "sourceTitle": "安化黑茶",
      "sourceUrl": "https://zwfw-new.hunan.gov.cn/onething/basic/city/tszl/city_tszl_hnspecialty_details.jsp?specialty_id=NlSh7Ga1S8C-fyKGuOI4ZA"
    },
    {
      "id": "HN-INDUSTRY-1-02",
      "themeId": "industry",
      "levelId": "industry-1",
      "title": "湘潭县重点发展的“湘莲”产业与哪种植物相关？",
      "options": [
        "莲",
        "柑橘树",
        "黄桃树",
        "茶树"
      ],
      "answer": 0,
      "explanation": "湘莲产业围绕莲的种植、加工和品牌发展。",
      "sourceTitle": "湘潭县推进湘莲产业发展的意见",
      "sourceUrl": "https://www.hunan.gov.cn/zqt/zcsd/202004/t20200422_13574834.html"
    },
    {
      "id": "HN-INDUSTRY-1-03",
      "themeId": "industry",
      "levelId": "industry-1",
      "title": "“龙山百合”这一特色物产的代表产地是哪里？",
      "options": [
        "新化县",
        "湘阴县",
        "桂东县",
        "龙山县"
      ],
      "answer": 3,
      "explanation": "龙山百合是湘西龙山县的特色产业。",
      "sourceTitle": "龙山百合从卖产品到种风景",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/szdt/202403/t20240318_33255430.html"
    },
    {
      "id": "HN-INDUSTRY-1-04",
      "themeId": "industry",
      "levelId": "industry-1",
      "title": "“古丈毛尖”主要属于哪类产品？",
      "options": [
        "烟花",
        "织锦",
        "茶叶",
        "陶瓷"
      ],
      "answer": 2,
      "explanation": "古丈毛尖是湖南地方茶叶产品。",
      "sourceTitle": "大湘西茶叶公共品牌建设实施方案",
      "sourceUrl": "https://fgw.hunan.gov.cn/xxgk_70899/zcfg/dfxfg/201512/t20151219_2085894.html"
    },
    {
      "id": "HN-INDUSTRY-1-05",
      "themeId": "industry",
      "levelId": "industry-1",
      "title": "“保靖黄金茶”中的“茶”指哪类产品？",
      "options": [
        "黄金矿石",
        "金属饰品",
        "黄色陶土",
        "茶叶"
      ],
      "answer": 3,
      "explanation": "黄金茶是保靖的茶叶产品，不能按名称理解为黄金。",
      "sourceTitle": "保靖黄金茶入列中欧地理标志协定",
      "sourceUrl": "https://agri.hunan.gov.cn/agri/xxgk/gzdt/sxdt_1/202103/t20210305_14747785.html"
    },
    {
      "id": "HN-INDUSTRY-1-06",
      "themeId": "industry",
      "levelId": "industry-1",
      "title": "醴陵釉下五彩的代表产品是什么？",
      "options": [
        "年画",
        "莲子",
        "瓷器",
        "茶砖"
      ],
      "answer": 2,
      "explanation": "釉下五彩是醴陵具有代表性的制瓷工艺。",
      "sourceTitle": "湖南釉下五彩瓷进博会绽放魅力",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/zwdt/201911/t20191106_10508396.html"
    },
    {
      "id": "HN-INDUSTRY-1-07",
      "themeId": "industry",
      "levelId": "industry-1",
      "title": "浏阳的特色产业“花炮”主要生产什么？",
      "options": [
        "织锦被面",
        "烟花爆竹",
        "彩绘瓷瓶",
        "发酵茶砖"
      ],
      "answer": 1,
      "explanation": "浏阳花炮是烟花爆竹类地方产品。",
      "sourceTitle": "安化黑茶保靖黄金茶再次出圈",
      "sourceUrl": "https://gxt.hunan.gov.cn/gxt/xxgk_71033/gzdt/rdjj/202109/t20210903_20508938.html"
    },
    {
      "id": "HN-INDUSTRY-1-08",
      "themeId": "industry",
      "levelId": "industry-1",
      "title": "祁东黄花菜采摘时，主要采收哪一部分？",
      "options": [
        "成熟后的种子",
        "整株木质树干",
        "植物的主根",
        "尚未开放的花蕾"
      ],
      "answer": 3,
      "explanation": "黄花菜采收以未开放的花蕾为主。",
      "sourceTitle": "祁东黄花菜进入采摘期",
      "sourceUrl": "https://www.hunan.gov.cn/hnyw/szdt/202606/t20260622_34008708.html"
    },
    {
      "id": "HN-INDUSTRY-1-09",
      "themeId": "industry",
      "levelId": "industry-1",
      "title": "紫鹊界梯田位于湖南哪个县？",
      "options": [
        "汝城县",
        "新化县",
        "江永县",
        "隆回县"
      ],
      "answer": 1,
      "explanation": "紫鹊界梯田位于娄底市新化县。",
      "sourceTitle": "紫鹊界的神奇密码",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/zwdt/202008/t20200807_13352063.html"
    },
    {
      "id": "HN-INDUSTRY-1-10",
      "themeId": "industry",
      "levelId": "industry-1",
      "title": "炎陵县具有代表性的特色果品是哪种？",
      "options": [
        "椰枣",
        "榴莲",
        "椰子",
        "黄桃"
      ],
      "answer": 3,
      "explanation": "炎陵黄桃是当地特色农业品牌。",
      "sourceTitle": "炎陵黄桃商标品牌建设优秀案例",
      "sourceUrl": "https://amr.hunan.gov.cn/amr/ztx/zscqqsx/zscqqs/zscqbh/202301/t20230116_29184233.html"
    },
    {
      "id": "HN-INDUSTRY-2-01",
      "themeId": "industry",
      "levelId": "industry-2",
      "title": "同是茶叶，安化黑茶和只做鲜叶展示为何不能视为同一加工成品？",
      "options": [
        "所有茶叶离开树就自动成为黑茶",
        "加工过程和成品状态不同",
        "只要重量相等就具有同样工艺",
        "包装颜色决定是否完成发酵"
      ],
      "answer": 1,
      "explanation": "茶叶加工影响成品性质，鲜叶与后发酵成品不能混同。",
      "sourceTitle": "安化黑茶",
      "sourceUrl": "https://zwfw-new.hunan.gov.cn/onething/basic/city/tszl/city_tszl_hnspecialty_details.jsp?specialty_id=NlSh7Ga1S8C-fyKGuOI4ZA"
    },
    {
      "id": "HN-INDUSTRY-2-02",
      "themeId": "industry",
      "levelId": "industry-2",
      "title": "湘莲产业包含种植、加工和销售，哪一项属于加工环节？",
      "options": [
        "在田间栽种莲",
        "把成品送到销售门店",
        "向顾客介绍产地",
        "把采收原料按工艺制成成品"
      ],
      "answer": 3,
      "explanation": "加工是原料转化为成品的环节，与种植销售不同。",
      "sourceTitle": "湘潭县推进湘莲产业发展的意见",
      "sourceUrl": "https://www.hunan.gov.cn/zqt/zcsd/202004/t20200422_13574834.html"
    },
    {
      "id": "HN-INDUSTRY-2-03",
      "themeId": "industry",
      "levelId": "industry-2",
      "title": "龙山百合产业同时探索干片与观赏花，最重要的区分是什么？",
      "options": [
        "花色相同就一定都能食用",
        "观赏产品都等同食用原料",
        "只要来自同一县就无需分类",
        "品种、用途与适用要求"
      ],
      "answer": 3,
      "explanation": "不同用途可能采用不同品种与要求，不能仅凭外观互换。",
      "sourceTitle": "龙山百合从卖产品到种风景",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/szdt/202403/t20240318_33255430.html"
    },
    {
      "id": "HN-INDUSTRY-2-04",
      "themeId": "industry",
      "levelId": "industry-2",
      "title": "介绍古丈毛尖时，哪条内容比“包装好看”更能说明地方特色？",
      "options": [
        "产地背景与制茶工艺",
        "快递盒的统一颜色",
        "广告配乐的播放次数",
        "主播衣服的品牌"
      ],
      "answer": 0,
      "explanation": "地方茶的特色与产地和工艺相关。",
      "sourceTitle": "大湘西茶叶公共品牌建设实施方案",
      "sourceUrl": "https://fgw.hunan.gov.cn/xxgk_70899/zcfg/dfxfg/201512/t20151219_2085894.html"
    },
    {
      "id": "HN-INDUSTRY-2-05",
      "themeId": "industry",
      "levelId": "industry-2",
      "title": "同学因“黄金茶”一名认定茶叶掺有黄金，应怎样解释？",
      "options": [
        "茶名能代替配料和工艺说明",
        "名称不代表加入贵金属，需看产品真实信息",
        "只看黄色包装就能确认含金",
        "凡是名字有黄金都一定含金"
      ],
      "answer": 1,
      "explanation": "产品名与实际原料不是同一概念。",
      "sourceTitle": "保靖黄金茶入列中欧地理标志协定",
      "sourceUrl": "https://agri.hunan.gov.cn/agri/xxgk/gzdt/sxdt_1/202103/t20210305_14747785.html"
    },
    {
      "id": "HN-INDUSTRY-2-06",
      "themeId": "industry",
      "levelId": "industry-2",
      "title": "醴陵釉下五彩中，“釉下”主要表示哪种工艺关系？",
      "options": [
        "烧成后在釉面粘纸花",
        "只给包装盒绘制图案",
        "彩绘完成后覆盖釉层再烧制",
        "先把瓷器磨成粉再绘图"
      ],
      "answer": 2,
      "explanation": "彩绘在釉层之下，彩绘后上釉并烧制。",
      "sourceTitle": "湖南釉下五彩瓷进博会绽放魅力",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/zwdt/201911/t20191106_10508396.html"
    },
    {
      "id": "HN-INDUSTRY-2-07",
      "themeId": "industry",
      "levelId": "industry-2",
      "title": "了解浏阳花炮产业时，哪项活动更适合学生？",
      "options": [
        "通过合规展览了解文化与生产分工",
        "仿照视频混合燃放材料",
        "自行拆开成品观察火药",
        "进入未开放生产区自行操作"
      ],
      "answer": 0,
      "explanation": "产业学习可通过展览进行，危险生产操作需专业资质与条件。",
      "sourceTitle": "安化黑茶保靖黄金茶再次出圈",
      "sourceUrl": "https://gxt.hunan.gov.cn/gxt/xxgk_71033/gzdt/rdjj/202109/t20210903_20508938.html"
    },
    {
      "id": "HN-INDUSTRY-2-08",
      "themeId": "industry",
      "levelId": "industry-2",
      "title": "农户赶在黄花菜开放前采摘，主要是为了符合什么要求？",
      "options": [
        "证明夜晚所有作物都更高产",
        "花蕾采收与加工的品质要求",
        "让植物永远不再开花",
        "把所有花蕾改造成茶叶"
      ],
      "answer": 1,
      "explanation": "采收对象是花蕾，时间选择服务于品质要求。",
      "sourceTitle": "祁东黄花菜进入采摘期",
      "sourceUrl": "https://www.hunan.gov.cn/hnyw/szdt/202606/t20260622_34008708.html"
    },
    {
      "id": "HN-INDUSTRY-2-09",
      "themeId": "industry",
      "levelId": "industry-2",
      "title": "山坡上的紫鹊界梯田分层布置，体现哪种农业思路？",
      "options": [
        "适应坡地条件组织耕作",
        "把所有坡地改成平坦海滩",
        "证明山地不能发展农业",
        "完全忽略地形差异"
      ],
      "answer": 0,
      "explanation": "梯田体现对当地山地地形的适应。",
      "sourceTitle": "紫鹊界的神奇密码",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/zwdt/202008/t20200807_13352063.html"
    },
    {
      "id": "HN-INDUSTRY-2-10",
      "themeId": "industry",
      "levelId": "industry-2",
      "title": "炎陵黄桃品牌为什么要说明产地？",
      "options": [
        "产地名可以代替质量检查",
        "所有黄色水果都可叫炎陵黄桃",
        "写出县名就能保证任何产品合格",
        "地域信息是产品身份的重要部分"
      ],
      "answer": 3,
      "explanation": "地域品牌与特定产地相关，还需要质量等其他信息。",
      "sourceTitle": "炎陵黄桃商标品牌建设优秀案例",
      "sourceUrl": "https://amr.hunan.gov.cn/amr/ztx/zscqqsx/zscqqs/zscqbh/202301/t20230116_29184233.html"
    },
    {
      "id": "HN-INDUSTRY-3-01",
      "themeId": "industry",
      "levelId": "industry-3",
      "title": "黑茶宣传写“包装是黑色，所以就是安化黑茶”。哪项核查最重要？",
      "options": [
        "包装上的黑色色值",
        "主播使用的茶杯颜色",
        "运输车辆的车身颜色",
        "实际产地、产品类别和加工信息"
      ],
      "answer": 3,
      "explanation": "包装色不能证明产地和茶类身份。",
      "sourceTitle": "安化黑茶",
      "sourceUrl": "https://zwfw-new.hunan.gov.cn/onething/basic/city/tszl/city_tszl_hnspecialty_details.jsp?specialty_id=NlSh7Ga1S8C-fyKGuOI4ZA"
    },
    {
      "id": "HN-INDUSTRY-3-02",
      "themeId": "industry",
      "levelId": "industry-3",
      "title": "湘莲加工厂收到多户原料，怎样记录便于出现问题后追溯？",
      "options": [
        "用销售广告编号替代原料批次",
        "按来源、收货日期与批次建账",
        "只记当天总重量而不记来源",
        "把全部原料混合后删除来源"
      ],
      "answer": 1,
      "explanation": "来源与批次信息有助于定位原料与加工链条。",
      "sourceTitle": "湘潭县推进湘莲产业发展的意见",
      "sourceUrl": "https://www.hunan.gov.cn/zqt/zcsd/202004/t20200422_13574834.html"
    },
    {
      "id": "HN-INDUSTRY-3-03",
      "themeId": "industry",
      "levelId": "industry-3",
      "title": "百合园游客看到漂亮花朵便想带回食用，应先怎样判断？",
      "options": [
        "确认品种及用途，未经确认不当食材",
        "只凭拍照地点确定食用资格",
        "任何百合花漂亮就适合食用",
        "只按花朵颜色决定食用量"
      ],
      "answer": 0,
      "explanation": "观赏与食用用途不能直接互换，应先核实。",
      "sourceTitle": "龙山百合从卖产品到种风景",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/szdt/202403/t20240318_33255430.html"
    },
    {
      "id": "HN-INDUSTRY-3-04",
      "themeId": "industry",
      "levelId": "industry-3",
      "title": "两款毛尖价格不同，能否只凭价格认定贵的产地更真实？",
      "options": [
        "不能，因为所有茶叶产地都相同",
        "能，价格能直接证明产地",
        "能，价格高可免查任何资料",
        "不能，还要核对来源和产品说明"
      ],
      "answer": 3,
      "explanation": "价格不是产地证明，真实性需独立信息支持。",
      "sourceTitle": "大湘西茶叶公共品牌建设实施方案",
      "sourceUrl": "https://fgw.hunan.gov.cn/xxgk_70899/zcfg/dfxfg/201512/t20151219_2085894.html"
    },
    {
      "id": "HN-INDUSTRY-3-05",
      "themeId": "industry",
      "levelId": "industry-3",
      "title": "礼盒写“保靖黄金茶”，内页却只写“外地茶原料”。应重点查什么？",
      "options": [
        "盒子是否足够重",
        "产地身份及标签与实际原料的一致性",
        "礼袋提手是否黄色",
        "宣传视频是否有背景音乐"
      ],
      "answer": 1,
      "explanation": "地域名称与实际来源出现矛盾，应核对真实产品信息。",
      "sourceTitle": "保靖黄金茶入列中欧地理标志协定",
      "sourceUrl": "https://agri.hunan.gov.cn/agri/xxgk/gzdt/sxdt_1/202103/t20210305_14747785.html"
    },
    {
      "id": "HN-INDUSTRY-3-06",
      "themeId": "industry",
      "levelId": "industry-3",
      "title": "演示者在已烧好的釉面上贴印花纸，能直接称为完整釉下五彩制作吗？",
      "options": [
        "不能，其流程与釉下彩绘关系不符",
        "能，只要成品来自醴陵",
        "不能，因为瓷器不能出现任何图案",
        "能，只要图案含五种颜色"
      ],
      "answer": 0,
      "explanation": "工艺身份由制作过程决定，颜色数量和地点不足以证明。",
      "sourceTitle": "湖南釉下五彩瓷进博会绽放魅力",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/zwdt/201911/t20191106_10508396.html"
    },
    {
      "id": "HN-INDUSTRY-3-07",
      "themeId": "industry",
      "levelId": "industry-3",
      "title": "花炮研学希望理解专业分工，哪份记录最合适？",
      "options": [
        "把危险操作当作学生必做项目",
        "下载配方后在家验证燃放效果",
        "记录展览介绍的设计、生产与检验职责",
        "只记录谁能点燃最多成品"
      ],
      "answer": 2,
      "explanation": "理解职责可通过合规展示，不需要学生开展危险操作。",
      "sourceTitle": "安化黑茶保靖黄金茶再次出圈",
      "sourceUrl": "https://gxt.hunan.gov.cn/gxt/xxgk_71033/gzdt/rdjj/202109/t20210903_20508938.html"
    },
    {
      "id": "HN-INDUSTRY-3-08",
      "themeId": "industry",
      "levelId": "industry-3",
      "title": "一批黄花菜采后久置且加工记录缺失，哪项做法更稳妥？",
      "options": [
        "用广告热度替代品质确认",
        "只换包装就按合格品销售",
        "与其他批次混合后不再保留信息",
        "先核查处理流程和品质，不直接混入合格批次"
      ],
      "answer": 3,
      "explanation": "产品处理与质量需核查，混合或包装不能解决记录缺口。",
      "sourceTitle": "祁东黄花菜进入采摘期",
      "sourceUrl": "https://www.hunan.gov.cn/hnyw/szdt/202606/t20260622_34008708.html"
    },
    {
      "id": "HN-INDUSTRY-3-09",
      "themeId": "industry",
      "levelId": "industry-3",
      "title": "有人建议填平梯田、切断原有水路来提高参观便利。主要问题是什么？",
      "options": [
        "只改变照片背景，没有其他影响",
        "可能破坏耕作景观与灌溉系统",
        "能保证所有农户收入相同",
        "会使所有稻田立即增加产量"
      ],
      "answer": 1,
      "explanation": "梯田与水路构成相联系的农业系统，不能只看参观方便。",
      "sourceTitle": "紫鹊界的神奇密码",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/zwdt/202008/t20200807_13352063.html"
    },
    {
      "id": "HN-INDUSTRY-3-10",
      "themeId": "industry",
      "levelId": "industry-3",
      "title": "一箱黄桃确实来自炎陵，就能认定每个果实都达到相同等级吗？",
      "options": [
        "能，县名决定每个果实大小",
        "不能，因为当地不可能种黄桃",
        "不能，产地与具体品质等级需分别核对",
        "能，地域品牌能替代分级"
      ],
      "answer": 2,
      "explanation": "产地身份不等同每个产品的等级与状态。",
      "sourceTitle": "炎陵黄桃商标品牌建设优秀案例",
      "sourceUrl": "https://amr.hunan.gov.cn/amr/ztx/zscqqsx/zscqqs/zscqbh/202301/t20230116_29184233.html"
    },
    {
      "id": "HN-INDUSTRY-4-01",
      "themeId": "industry",
      "levelId": "industry-4",
      "title": "班级比较两款茶，目标是理解加工差异。哪套方案更能排除干扰？",
      "options": [
        "核对加工方法，却不记录冲泡差异",
        "统一冲泡条件，只凭茶名猜加工方法",
        "核对加工方法，尽量统一冲泡条件",
        "只比较包装与售价，不核对加工说明"
      ],
      "answer": 2,
      "explanation": "明确加工信息并统一观察条件，才能减少无关差异。",
      "sourceTitle": "安化黑茶 / 大湘西茶叶公共品牌建设实施方案",
      "sourceUrl": "https://zwfw-new.hunan.gov.cn/onething/basic/city/tszl/city_tszl_hnspecialty_details.jsp?specialty_id=NlSh7Ga1S8C-fyKGuOI4ZA\nhttps://fgw.hunan.gov.cn/xxgk_70899/zcfg/dfxfg/201512/t20151219_2085894.html"
    },
    {
      "id": "HN-INDUSTRY-4-02",
      "themeId": "industry",
      "levelId": "industry-4",
      "title": "假设湘莲原料批次A经加工分成B、C两批成品。怎样登记最利于追溯？",
      "options": [
        "只保留B，删除A与C",
        "B、C各记录其来自A及加工日期",
        "把所有批次改为同一销售日期",
        "只记录广告名称而不记批次关系"
      ],
      "answer": 1,
      "explanation": "记录原料与成品批次对应关系，可从成品追到来源。",
      "sourceTitle": "湘潭县推进湘莲产业发展的意见",
      "sourceUrl": "https://www.hunan.gov.cn/zqt/zcsd/202004/t20200422_13574834.html"
    },
    {
      "id": "HN-INDUSTRY-4-03",
      "themeId": "industry",
      "levelId": "industry-4",
      "title": "百合合作社目标为“多用途且不混淆食用身份”。哪套方案满足？",
      "options": [
        "分设食用与观赏线，核对品种和标签",
        "拓展观赏线，把所有品种共用食用标签",
        "按花色划分用途，不保留品种记录",
        "仅做食用干片，不开展其他用途业务"
      ],
      "answer": 0,
      "explanation": "分类核对品种、用途和标签，才同时支持拓展与清楚表达。",
      "sourceTitle": "龙山百合从卖产品到种风景",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/szdt/202403/t20240318_33255430.html"
    },
    {
      "id": "HN-INDUSTRY-4-04",
      "themeId": "industry",
      "levelId": "industry-4",
      "title": "茶文化展要避免产地张冠李戴，哪组配对正确？",
      "options": [
        "古丈—炎陵黄桃，保靖—湘莲",
        "古丈—保靖黄金茶，保靖—古丈毛尖",
        "古丈—古丈毛尖，保靖—保靖黄金茶",
        "古丈—浏阳花炮，保靖—醴陵瓷器"
      ],
      "answer": 2,
      "explanation": "两种茶名分别对应古丈与保靖的地方产品。",
      "sourceTitle": "大湘西茶叶公共品牌建设实施方案 / 保靖黄金茶入列中欧地理标志协定",
      "sourceUrl": "https://fgw.hunan.gov.cn/xxgk_70899/zcfg/dfxfg/201512/t20151219_2085894.html\nhttps://agri.hunan.gov.cn/agri/xxgk/gzdt/sxdt_1/202103/t20210305_14747785.html"
    },
    {
      "id": "HN-INDUSTRY-4-05",
      "themeId": "industry",
      "levelId": "industry-4",
      "title": "简化流程规定“成型后彩绘，彩绘后上釉，上釉后烧制”。正确顺序是？",
      "options": [
        "上釉→成型→烧制→彩绘",
        "彩绘→烧制→成型→上釉",
        "成型→上釉→彩绘→烧制",
        "成型→彩绘→上釉→烧制"
      ],
      "answer": 3,
      "explanation": "按题设依赖排序，彩绘处于釉层之下。",
      "sourceTitle": "湖南釉下五彩瓷进博会绽放魅力",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/zwdt/201911/t20191106_10508396.html"
    },
    {
      "id": "HN-INDUSTRY-4-06",
      "themeId": "industry",
      "levelId": "industry-4",
      "title": "花炮课程要求“了解产业、适合未成年人、无需危险操作”。哪套方案符合？",
      "options": [
        "参观开放展馆，用模型介绍产业分工",
        "了解分工后自行拆解成品验证结构",
        "只参观其他产业，完全不介绍花炮",
        "在家试制材料，用操作视频完成作业"
      ],
      "answer": 0,
      "explanation": "展馆与模型能支持产业学习，同时避免危险操作。",
      "sourceTitle": "安化黑茶保靖黄金茶再次出圈",
      "sourceUrl": "https://gxt.hunan.gov.cn/gxt/xxgk_71033/gzdt/rdjj/202109/t20210903_20508938.html"
    },
    {
      "id": "HN-INDUSTRY-4-07",
      "themeId": "industry",
      "levelId": "industry-4",
      "title": "假设黄花菜两批原料来自同一田块，一批及时加工、一批长时间堆放。要分析成品差异，首先比什么？",
      "options": [
        "采后处理时间与实际加工记录",
        "仅比较田块位置，不再查处理记录",
        "只比较总重量，认定重量相同品质就同",
        "仅比较销售价格，推定价格决定品质"
      ],
      "answer": 0,
      "explanation": "题设突出采后处理差异，应首先核查对应流程。",
      "sourceTitle": "祁东黄花菜进入采摘期",
      "sourceUrl": "https://www.hunan.gov.cn/hnyw/szdt/202606/t20260622_34008708.html"
    },
    {
      "id": "HN-INDUSTRY-4-08",
      "themeId": "industry",
      "levelId": "industry-4",
      "title": "梯田旅游要求“保留耕作、保护水路、便于观察”。哪项方案满足最多条件？",
      "options": [
        "填平水路建设停车场",
        "沿现有合适路径设观察点并保留灌溉",
        "停种全部田块，只保留一张照片",
        "把溪水全部引走以修干燥步道"
      ],
      "answer": 1,
      "explanation": "观察设施应与耕作和灌溉相协调，不能破坏基础系统。",
      "sourceTitle": "紫鹊界的神奇密码",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/hnyw/zwdt/202008/t20200807_13352063.html"
    },
    {
      "id": "HN-INDUSTRY-4-09",
      "themeId": "industry",
      "levelId": "industry-4",
      "title": "假设炎陵果园有120个桃，检查后90个适合鲜售、30个需另评估。每盒鲜售6个，可装几盒？",
      "options": [
        "20盒",
        "30盒",
        "5盒",
        "15盒"
      ],
      "answer": 3,
      "explanation": "鲜售数量是90个，90÷6＝15盒，不能把待评估果计入。",
      "sourceTitle": "炎陵黄桃商标品牌建设优秀案例",
      "sourceUrl": "https://amr.hunan.gov.cn/amr/ztx/zscqqsx/zscqqs/zscqbh/202301/t20230116_29184233.html"
    },
    {
      "id": "HN-INDUSTRY-4-10",
      "themeId": "industry",
      "levelId": "industry-4",
      "title": "油茶项目要求“榨油之外利用副产物，且保留用途审核”。哪套计划符合？",
      "options": [
        "只审核茶油，副产物统一按任意用途销售",
        "只生产茶油，将全部副产物当无价值废物",
        "茶油与副产物分流，分别验证工艺和用途",
        "开展副产物利用，默认植物原料免审"
      ],
      "answer": 2,
      "explanation": "分流和用途验证能支持综合利用，同时保留质量边界。",
      "sourceTitle": "油茶主要栽培物种 / 油茶丰产栽培技术",
      "sourceUrl": "https://lyj.hunan.gov.cn/tslm_71206/lykp/syjs/201512/t20151227_2610844.html\nhttps://lyj.hunan.gov.cn/lyj/tslm_71206/lykp/syjs/201512/t20151227_2602802.html"
    },
    {
      "id": "HN-ECOLOGY-1-01",
      "themeId": "ecology",
      "levelId": "ecology-1",
      "title": "湖南“四水”指哪组河流？",
      "options": [
        "湘江、资江、沅江、澧水",
        "湘江、汉江、黄河、澧水",
        "长江、黄河、海河、辽河",
        "珠江、闽江、钱塘江、淮河"
      ],
      "answer": 0,
      "explanation": "湖南四水为湘、资、沅、澧，是洞庭湖水系的主要骨架。",
      "sourceTitle": "湖南自然地理",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hngk/zrdl/zrdl.html"
    },
    {
      "id": "HN-ECOLOGY-1-02",
      "themeId": "ecology",
      "levelId": "ecology-1",
      "title": "湖南主要水系以哪个湖泊为中心组织？",
      "options": [
        "太湖",
        "滇池",
        "洞庭湖",
        "青海湖"
      ],
      "answer": 2,
      "explanation": "湖南主要水系以洞庭湖为中心，四水汇向湖区。",
      "sourceTitle": "湖南自然地理",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hngk/zrdl/zrdl.html"
    },
    {
      "id": "HN-ECOLOGY-1-03",
      "themeId": "ecology",
      "levelId": "ecology-1",
      "title": "武陵源著名的高耸石峰主要属于哪种地貌？",
      "options": [
        "石英砂岩峰林",
        "极地冰川",
        "现代沙漠沙丘",
        "人工堆土丘"
      ],
      "answer": 0,
      "explanation": "武陵源以石英砂岩峰林等自然景观闻名。",
      "sourceTitle": "武陵源世界自然遗产",
      "sourceUrl": "https://lyj.hunan.gov.cn/lyj/xxgk_71167/gzdt/mtkl/202504/t20250415_33642076.html"
    },
    {
      "id": "HN-ECOLOGY-1-04",
      "themeId": "ecology",
      "levelId": "ecology-1",
      "title": "新宁崀山以哪类地貌著称？",
      "options": [
        "冰川地貌",
        "海岸珊瑚礁",
        "沙漠地貌",
        "丹霞地貌"
      ],
      "answer": 3,
      "explanation": "崀山是中国丹霞系列世界自然遗产点之一。",
      "sourceTitle": "崀山世界自然遗产",
      "sourceUrl": "https://lyj.hunan.gov.cn/xxgk_71167/gzdt/mtkl/202505/t20250528_33685013.html"
    },
    {
      "id": "HN-ECOLOGY-1-05",
      "themeId": "ecology",
      "levelId": "ecology-1",
      "title": "壶瓶山国家级自然保护区位于哪个县？",
      "options": [
        "石门县",
        "江永县",
        "新化县",
        "祁东县"
      ],
      "answer": 0,
      "explanation": "壶瓶山保护区位于常德石门。",
      "sourceTitle": "壶瓶山自然保护区先进事迹简介",
      "sourceUrl": "https://lyj.hunan.gov.cn/xxgk_71167/gzdt/xlkb/200402/t20040220_2835402.html"
    },
    {
      "id": "HN-ECOLOGY-1-06",
      "themeId": "ecology",
      "levelId": "ecology-1",
      "title": "莽山国家级自然保护区位于湖南哪个县？",
      "options": [
        "安化县",
        "双峰县",
        "龙山县",
        "宜章县"
      ],
      "answer": 3,
      "explanation": "莽山保护区位于郴州宜章。",
      "sourceTitle": "湖南莽山国家级自然保护区",
      "sourceUrl": "https://lyj.hunan.gov.cn/tslm_71206/slly/zrbhq/201512/t20151227_2587424.html"
    },
    {
      "id": "HN-ECOLOGY-1-07",
      "themeId": "ecology",
      "levelId": "ecology-1",
      "title": "湖南衡山在“五岳”中称为什么？",
      "options": [
        "东岳",
        "北岳",
        "西岳",
        "南岳"
      ],
      "answer": 3,
      "explanation": "衡山是南岳，位于湖南衡阳一带。",
      "sourceTitle": "湖南省南岳衡山自然保护区",
      "sourceUrl": "https://lyj.hunan.gov.cn/lyj/ztzl/gdzt/zrbhq/201512/t20151227_2587456.html"
    },
    {
      "id": "HN-ECOLOGY-1-08",
      "themeId": "ecology",
      "levelId": "ecology-1",
      "title": "东江湖位于湖南哪个县级市？",
      "options": [
        "浏阳市",
        "韶山市",
        "资兴市",
        "汨罗市"
      ],
      "answer": 2,
      "explanation": "东江湖是资兴的重要水源与旅游景观。",
      "sourceTitle": "东江湖多措并举呵护湘南洞庭",
      "sourceUrl": "https://slt.hunan.gov.cn/ztzl/qmtxhzz/c102489/201908/t20190823_29159051.html"
    },
    {
      "id": "HN-ECOLOGY-1-09",
      "themeId": "ecology",
      "levelId": "ecology-1",
      "title": "洞庭湖湿地能为哪组动物提供生境？",
      "options": [
        "珊瑚虫、海马和小丑鱼",
        "骆驼、沙漠蝎和沙狐",
        "候鸟、麋鹿和江豚",
        "企鹅、北极熊和海豹"
      ],
      "answer": 2,
      "explanation": "洞庭湖湖区为候鸟及珍稀野生动物提供重要生境。",
      "sourceTitle": "洞庭湖水环境综合治理实施方案",
      "sourceUrl": "https://www.hunan.gov.cn/topic/djssw/stwm/stwmzc/201911/t20191110_14137619.html"
    },
    {
      "id": "HN-ECOLOGY-1-10",
      "themeId": "ecology",
      "levelId": "ecology-1",
      "title": "莽山资料列出的南方红豆杉属于哪类生物？",
      "options": [
        "植物",
        "鱼类",
        "昆虫",
        "鸟类"
      ],
      "answer": 0,
      "explanation": "南方红豆杉是森林植物，莽山保存着相关资源。",
      "sourceTitle": "湖南莽山国家级自然保护区",
      "sourceUrl": "https://lyj.hunan.gov.cn/tslm_71206/slly/zrbhq/201512/t20151227_2587424.html"
    },
    {
      "id": "HN-ECOLOGY-2-01",
      "themeId": "ecology",
      "levelId": "ecology-2",
      "title": "上游河流污染可能影响下游湖泊，主要因为哪种联系？",
      "options": [
        "行政边界能挡住全部污染物",
        "水流把不同区域连接起来",
        "湖泊能自动隔绝所有河水",
        "地图颜色能改变水的流向"
      ],
      "answer": 1,
      "explanation": "流域通过水流相连，保护需要考虑上下游关系。",
      "sourceTitle": "湖南自然地理",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hngk/zrdl/zrdl.html"
    },
    {
      "id": "HN-ECOLOGY-2-02",
      "themeId": "ecology",
      "levelId": "ecology-2",
      "title": "武陵源峰林的形成，与哪些自然过程相关？",
      "options": [
        "把普通沙堆瞬间冻结",
        "游客一年内堆砌石块",
        "地层抬升与长期风化侵蚀",
        "统一倒模制造所有山峰"
      ],
      "answer": 2,
      "explanation": "地质运动和长期侵蚀共同塑造自然峰林。",
      "sourceTitle": "武陵源世界自然遗产",
      "sourceUrl": "https://lyj.hunan.gov.cn/lyj/xxgk_71167/gzdt/mtkl/202504/t20250415_33642076.html"
    },
    {
      "id": "HN-ECOLOGY-2-03",
      "themeId": "ecology",
      "levelId": "ecology-2",
      "title": "崀山一些特有植物只生长在狭窄岩壁生境，保护时为何要保护岩壁环境？",
      "options": [
        "改变岩壁环境一定提高数量",
        "把岩壁刷漆能替代生境保护",
        "只要保留植物照片就能维持种群",
        "植物生存依赖特定条件"
      ],
      "answer": 3,
      "explanation": "保护物种需要同时保护其生存环境。",
      "sourceTitle": "崀山世界自然遗产",
      "sourceUrl": "https://lyj.hunan.gov.cn/xxgk_71167/gzdt/mtkl/202505/t20250528_33685013.html"
    },
    {
      "id": "HN-ECOLOGY-2-04",
      "themeId": "ecology",
      "levelId": "ecology-2",
      "title": "为什么洞庭湖保护不能只把所有浅滩改成硬质广场？",
      "options": [
        "浅滩没有任何生态作用",
        "浅滩也是野生动物生活与觅食空间",
        "硬质地面必定增加所有鸟类食物",
        "只要游客方便就无需生境"
      ],
      "answer": 1,
      "explanation": "湿地多样空间提供不同生态功能，改造需考虑生境。",
      "sourceTitle": "洞庭湖水环境综合治理实施方案",
      "sourceUrl": "https://www.hunan.gov.cn/topic/djssw/stwm/stwmzc/201911/t20191110_14137619.html"
    },
    {
      "id": "HN-ECOLOGY-2-05",
      "themeId": "ecology",
      "levelId": "ecology-2",
      "title": "减轻捕捞压力主要有助于什么？",
      "options": [
        "给水生生物恢复和繁衍的空间",
        "用一项措施解决全部生态问题",
        "让所有鱼立即变成同一种",
        "使湖泊不再需要水质保护"
      ],
      "answer": 0,
      "explanation": "减轻捕捞压力是保护水生生物的一环，仍需其他保护措施。",
      "sourceTitle": "湖南禁捕工作开展两年来",
      "sourceUrl": "https://www.hunan.gov.cn/hnyw/zwdt/202203/t20220329_22724416.html"
    },
    {
      "id": "HN-ECOLOGY-2-06",
      "themeId": "ecology",
      "levelId": "ecology-2",
      "title": "东江湖同时有旅游和水源价值，发展旅游首先要注意什么？",
      "options": [
        "把水质观察全部取消",
        "用宣传图片代替实际保护",
        "只增加游客数量而不管污水",
        "控制污染并保护水源功能"
      ],
      "answer": 3,
      "explanation": "旅游活动需与水源保护相协调。",
      "sourceTitle": "东江湖多措并举呵护湘南洞庭",
      "sourceUrl": "https://slt.hunan.gov.cn/ztzl/qmtxhzz/c102489/201908/t20190823_29159051.html"
    },
    {
      "id": "HN-ECOLOGY-2-07",
      "themeId": "ecology",
      "levelId": "ecology-2",
      "title": "壶瓶山有多种野生动植物，为什么不宜只保留一种树？",
      "options": [
        "多样生境有助于支持多样生物",
        "只有统一外观才有生态价值",
        "树种越少就保证物种越多",
        "所有动物只需要同一种树"
      ],
      "answer": 0,
      "explanation": "生物需要不同资源与环境，单一化可能影响生态多样性。",
      "sourceTitle": "壶瓶山自然保护区先进事迹简介",
      "sourceUrl": "https://lyj.hunan.gov.cn/xxgk_71167/gzdt/xlkb/200402/t20040220_2835402.html"
    },
    {
      "id": "HN-ECOLOGY-2-08",
      "themeId": "ecology",
      "levelId": "ecology-2",
      "title": "在莽山观察植物，哪种记录方式更能兼顾学习与保护？",
      "options": [
        "在树干刻名字帮助识别",
        "沿开放路线观察并拍照记录",
        "把不认识的植株全部拔走",
        "摘尽果实带回作为纪念"
      ],
      "answer": 1,
      "explanation": "非破坏性观察可记录信息并减少干扰。",
      "sourceTitle": "湖南莽山国家级自然保护区",
      "sourceUrl": "https://lyj.hunan.gov.cn/tslm_71206/slly/zrbhq/201512/t20151227_2587424.html"
    },
    {
      "id": "HN-ECOLOGY-2-09",
      "themeId": "ecology",
      "levelId": "ecology-2",
      "title": "山地植被被大面积破坏后，哪种风险值得关注？",
      "options": [
        "山体自动变为平原",
        "所有雨水都永久消失",
        "水土流失增加",
        "所有溪流都立即冻结"
      ],
      "answer": 2,
      "explanation": "植被保护土壤与调节水分，破坏可能增加流失风险。",
      "sourceTitle": "湖南省南岳衡山自然保护区",
      "sourceUrl": "https://lyj.hunan.gov.cn/lyj/ztzl/gdzt/zrbhq/201512/t20151227_2587456.html"
    },
    {
      "id": "HN-ECOLOGY-2-10",
      "themeId": "ecology",
      "levelId": "ecology-2",
      "title": "游客较多的民宿使用节水设施，主要解决什么问题？",
      "options": [
        "让客房不再需要任何用水",
        "用广告代替供水维护",
        "减少不必要的用水浪费",
        "以器具颜色判断水质"
      ],
      "answer": 2,
      "explanation": "节水设施和管理能减少浪费，但不等于不用水。",
      "sourceTitle": "南岳推动节水",
      "sourceUrl": "https://slt.hunan.gov.cn/xxgk/slxw/sxsl/202211/t20221125_29137952.html"
    },
    {
      "id": "HN-ECOLOGY-3-01",
      "themeId": "ecology",
      "levelId": "ecology-3",
      "title": "一条河上游排水、下游取水，哪种治理方式更能反映流域联系？",
      "options": [
        "各自只管地图边界以内的照片",
        "上游以污染已流走为由不记录",
        "上下游共享信息并协同减污",
        "下游只增设宣传牌不查来源"
      ],
      "answer": 2,
      "explanation": "水流跨越行政边界，协同治理有助于处理上下游影响。",
      "sourceTitle": "湖南自然地理",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hngk/zrdl/zrdl.html"
    },
    {
      "id": "HN-ECOLOGY-3-02",
      "themeId": "ecology",
      "levelId": "ecology-3",
      "title": "山峰被叫作“骆驼”或“将军”，能由此判断岩石形成原因吗？",
      "options": [
        "能，山峰一定由同名动物堆成",
        "不能，因为所有山峰都无自然成因",
        "能，名称就是岩石的真实材料",
        "不能，象形名称与地质成因不同"
      ],
      "answer": 3,
      "explanation": "形象命名描述外观，成因需地质资料支持。",
      "sourceTitle": "武陵源世界自然遗产",
      "sourceUrl": "https://lyj.hunan.gov.cn/lyj/xxgk_71167/gzdt/mtkl/202504/t20250415_33642076.html"
    },
    {
      "id": "HN-ECOLOGY-3-03",
      "themeId": "ecology",
      "levelId": "ecology-3",
      "title": "发现一种只在少数岩壁生长的植物，应优先怎样做？",
      "options": [
        "记录位置并请专业人员评估生境保护",
        "公开引导游客逐株采集",
        "给岩壁刷漆使照片更亮",
        "把所有植株移到操场试种"
      ],
      "answer": 0,
      "explanation": "狭窄生境物种可能较脆弱，应减少干扰并请专业人员判断。",
      "sourceTitle": "崀山世界自然遗产",
      "sourceUrl": "https://lyj.hunan.gov.cn/xxgk_71167/gzdt/mtkl/202505/t20250528_33685013.html"
    },
    {
      "id": "HN-ECOLOGY-3-04",
      "themeId": "ecology",
      "levelId": "ecology-3",
      "title": "同学在一个观鸟点没见到鸟，能否判断整个洞庭湖没有候鸟？",
      "options": [
        "不能，需考虑地点、时间与观察条件",
        "能，没看到就是物种消失",
        "不能，因为观鸟永远无法获得信息",
        "能，一个点代表整个湖区"
      ],
      "answer": 0,
      "explanation": "未观察到不等于不存在，样本范围与方法影响结果。",
      "sourceTitle": "洞庭湖水环境综合治理实施方案",
      "sourceUrl": "https://www.hunan.gov.cn/topic/djssw/stwm/stwmzc/201911/t20191110_14137619.html"
    },
    {
      "id": "HN-ECOLOGY-3-05",
      "themeId": "ecology",
      "levelId": "ecology-3",
      "title": "一段视频里江豚出现次数多，能单独证明全湖数量增加吗？",
      "options": [
        "不能，因为视频完全没有观察价值",
        "能，重复剪辑次数就是种群数量",
        "不能，要用可比较的调查资料",
        "能，点赞越多就表示数量越多"
      ],
      "answer": 2,
      "explanation": "视频可能重复或覆盖有限，数量趋势需要系统调查。",
      "sourceTitle": "湖南禁捕工作开展两年来",
      "sourceUrl": "https://www.hunan.gov.cn/hnyw/zwdt/202203/t20220329_22724416.html"
    },
    {
      "id": "HN-ECOLOGY-3-06",
      "themeId": "ecology",
      "levelId": "ecology-3",
      "title": "看到东江湖水面清澈，能直接认定取来的水适合饮用吗？",
      "options": [
        "不能，因为清澈湖水一定被污染",
        "能，透明就代表没有任何风险",
        "不能，外观不能替代水质检测与处理",
        "能，湖泊是景点就可直接饮水"
      ],
      "answer": 2,
      "explanation": "水源价值不等于个人直接饮用条件，需按供水要求检测处理。",
      "sourceTitle": "东江湖多措并举呵护湘南洞庭",
      "sourceUrl": "https://slt.hunan.gov.cn/ztzl/qmtxhzz/c102489/201908/t20190823_29159051.html"
    },
    {
      "id": "HN-ECOLOGY-3-07",
      "themeId": "ecology",
      "levelId": "ecology-3",
      "title": "壶瓶山调查组沿开放路线记录物种，哪种额外行为会增加干扰？",
      "options": [
        "保持合适距离观察",
        "播放声音反复吸引动物靠近",
        "记录观察时间与地点",
        "把物种不确定性写入笔记"
      ],
      "answer": 1,
      "explanation": "主动吸引可能改变动物行为，影响保护与观察结果。",
      "sourceTitle": "壶瓶山自然保护区先进事迹简介",
      "sourceUrl": "https://lyj.hunan.gov.cn/xxgk_71167/gzdt/xlkb/200402/t20040220_2835402.html"
    },
    {
      "id": "HN-ECOLOGY-3-08",
      "themeId": "ecology",
      "levelId": "ecology-3",
      "title": "莽山遇到不认识的野生动物，哪种处理较合适？",
      "options": [
        "先抓住装袋再辨认",
        "为了近照堵住它的退路",
        "根据外观猜无害就徒手接触",
        "保持距离，记录后请专业人员识别"
      ],
      "answer": 3,
      "explanation": "未知动物可能受惊或存在风险，保持距离更稳妥。",
      "sourceTitle": "湖南莽山国家级自然保护区",
      "sourceUrl": "https://lyj.hunan.gov.cn/tslm_71206/slly/zrbhq/201512/t20151227_2587424.html"
    },
    {
      "id": "HN-ECOLOGY-3-09",
      "themeId": "ecology",
      "levelId": "ecology-3",
      "title": "两处坡地一处植被少、一处流失多，仅凭这次观察能认定唯一原因吗？",
      "options": [
        "不能，还要考虑坡度、降雨和土壤等",
        "不能，因为植被与土壤绝无联系",
        "能，看到同时出现就能排除其他因素",
        "能，只需要选一张最清楚的照片"
      ],
      "answer": 0,
      "explanation": "生态变化可能由多因素共同造成，应补充条件信息。",
      "sourceTitle": "湖南省南岳衡山自然保护区",
      "sourceUrl": "https://lyj.hunan.gov.cn/lyj/ztzl/gdzt/zrbhq/201512/t20151227_2587456.html"
    },
    {
      "id": "HN-ECOLOGY-3-10",
      "themeId": "ecology",
      "levelId": "ecology-3",
      "title": "民宿总用水下降，但入住人数也下降。怎样更公平比较节水变化？",
      "options": [
        "只用水费金额而不管价格变化",
        "只按总用水减少认定器具有效",
        "只看入住人数，不看用水",
        "比较相近条件下的人均用水并记录其他变化"
      ],
      "answer": 3,
      "explanation": "总量受人数影响，比较时需考虑规模与条件。",
      "sourceTitle": "南岳推动节水",
      "sourceUrl": "https://slt.hunan.gov.cn/xxgk/slxw/sxsl/202211/t20221125_29137952.html"
    },
    {
      "id": "HN-ECOLOGY-4-01",
      "themeId": "ecology",
      "levelId": "ecology-4",
      "title": "题设：上游污水进入河流，下游湖边反复清垃圾。若要减少持续污染，应优先补什么？",
      "options": [
        "查清并治理上游污水来源，继续维护湖岸",
        "加密下游清理，但不查上游排水情况",
        "把污染物移到另一河段，不改变排水",
        "只治理上游，取消全部湖岸维护"
      ],
      "answer": 0,
      "explanation": "持续来源需从源头治理，末端清理仍有维护作用。",
      "sourceTitle": "湖南自然地理 / 省人大调研东江湖饮用水源保护",
      "sourceUrl": "https://www.hunan.gov.cn/hnszf/jxxx/hngk/zrdl/zrdl.html\nhttps://sthjt.hunan.gov.cn/xxgk/xwdt/szxw/201409/t20140903_4649960.html"
    },
    {
      "id": "HN-ECOLOGY-4-02",
      "themeId": "ecology",
      "levelId": "ecology-4",
      "title": "资料甲写“石英砂岩峰林”，乙写“红层形成的丹霞”。对应地点是哪组？",
      "options": [
        "甲崀山，乙武陵源",
        "甲东江湖，乙洞庭湖",
        "甲武陵源，乙崀山",
        "甲岳麓书院，乙洪江古商城"
      ],
      "answer": 2,
      "explanation": "两地都有壮观山峰，但地貌特征与岩层背景不同。",
      "sourceTitle": "武陵源世界自然遗产 / 崀山世界自然遗产",
      "sourceUrl": "https://lyj.hunan.gov.cn/lyj/xxgk_71167/gzdt/mtkl/202504/t20250415_33642076.html\nhttps://lyj.hunan.gov.cn/xxgk_71167/gzdt/mtkl/202505/t20250528_33685013.html"
    },
    {
      "id": "HN-ECOLOGY-4-03",
      "themeId": "ecology",
      "levelId": "ecology-4",
      "title": "某岩壁有特有植物，项目要求“保留生境、允许远观”。哪种方案符合？",
      "options": [
        "限制近距离进入，设远处观察与讲解点",
        "保留岩壁，取消全部远观和讲解渠道",
        "保留植物，但开放游客穿行其生长岩壁",
        "把植株移入花盆，只保留原址介绍牌"
      ],
      "answer": 0,
      "explanation": "远处观察与进入限制能兼顾学习和脆弱生境保护。",
      "sourceTitle": "崀山世界自然遗产",
      "sourceUrl": "https://lyj.hunan.gov.cn/xxgk_71167/gzdt/mtkl/202505/t20250528_33685013.html"
    },
    {
      "id": "HN-ECOLOGY-4-04",
      "themeId": "ecology",
      "levelId": "ecology-4",
      "title": "两组记录候鸟，一组清晨观察1小时，另一组午后观察10分钟。如何比较更可靠？",
      "options": [
        "尽量统一时段、时长和范围，再记录条件",
        "只把较小数字乘十就不需其他信息",
        "直接用总数判断哪处生境更好",
        "按观鸟者人数判定鸟类数量"
      ],
      "answer": 0,
      "explanation": "观察投入和时段不同会影响记录，需提高方法可比性。",
      "sourceTitle": "洞庭湖水环境综合治理实施方案",
      "sourceUrl": "https://www.hunan.gov.cn/topic/djssw/stwm/stwmzc/201911/t20191110_14137619.html"
    },
    {
      "id": "HN-ECOLOGY-4-05",
      "themeId": "ecology",
      "levelId": "ecology-4",
      "title": "方案要求“保护水生动物及其环境”。哪组措施覆盖更完整？",
      "options": [
        "仅处理污水，不关注捕捞与生境变化",
        "仅限制捕捞，不处理水域污染和生境损失",
        "减轻捕捞压力、减少污染并维护生境",
        "仅扩大宣传，不检查实际压力和环境"
      ],
      "answer": 2,
      "explanation": "动物保护需要兼顾直接压力、环境质量与生境。",
      "sourceTitle": "湖南禁捕工作开展两年来",
      "sourceUrl": "https://www.hunan.gov.cn/hnyw/zwdt/202203/t20220329_22724416.html"
    },
    {
      "id": "HN-ECOLOGY-4-06",
      "themeId": "ecology",
      "levelId": "ecology-4",
      "title": "湖边民宿要兼顾游客接待和东江湖保护，哪套做法符合？",
      "options": [
        "仅减少客房用水，不处理生活污水和垃圾",
        "规范污水处理，但把生活垃圾留在湖岸",
        "增加床位，只宣传保护而不完善处理",
        "合理接待，规范污水垃圾处理并节水"
      ],
      "answer": 3,
      "explanation": "接待规模与污染治理、节水措施应共同考虑。",
      "sourceTitle": "东江湖多措并举呵护湘南洞庭 / 省人大调研东江湖饮用水源保护",
      "sourceUrl": "https://slt.hunan.gov.cn/ztzl/qmtxhzz/c102489/201908/t20190823_29159051.html\nhttps://sthjt.hunan.gov.cn/xxgk/xwdt/szxw/201409/t20140903_4649960.html"
    },
    {
      "id": "HN-ECOLOGY-4-07",
      "themeId": "ecology",
      "levelId": "ecology-4",
      "title": "假设两条步道都观察1小时，甲记录5种鸟20只，乙2种鸟30只。只按记录，哪句正确？",
      "options": [
        "甲记录的种类更多，乙记录的个体更多",
        "乙个体多，所以一定记录了更多种",
        "甲个体少，所以一定没有保护价值",
        "两组都能准确代表整个保护区"
      ],
      "answer": 0,
      "explanation": "种类数与个体数分开比较，不能外推整个保护区状况。",
      "sourceTitle": "壶瓶山自然保护区先进事迹简介",
      "sourceUrl": "https://lyj.hunan.gov.cn/xxgk_71167/gzdt/xlkb/200402/t20040220_2835402.html"
    },
    {
      "id": "HN-ECOLOGY-4-08",
      "themeId": "ecology",
      "levelId": "ecology-4",
      "title": "森林课程提出“学习植物、减少采集、保留未知”。哪份成果符合？",
      "options": [
        "记录植物名称，却拔取未知植株作证明",
        "附观察位置与照片，不确定名称待核对",
        "不采集植物，但只交旅游照片而无观察",
        "附位置与照片，所有未知名统一猜填"
      ],
      "answer": 1,
      "explanation": "观察记录与谨慎识别支持学习，也减少对自然的破坏。",
      "sourceTitle": "湖南莽山国家级自然保护区",
      "sourceUrl": "https://lyj.hunan.gov.cn/tslm_71206/slly/zrbhq/201512/t20151227_2587424.html"
    },
    {
      "id": "HN-ECOLOGY-4-09",
      "themeId": "ecology",
      "levelId": "ecology-4",
      "title": "山脚溪流出现泥沙增加，假设上游刚有植被破坏。调查应如何设计？",
      "options": [
        "只调查溪边宣传牌是否更新",
        "仅凭同时发生就确定只有植被一个原因",
        "用景区门票数量直接推算泥沙来源",
        "同时查植被、降雨、坡度与土壤，比较前后资料"
      ],
      "answer": 3,
      "explanation": "可能存在联系，但多因素资料才能支持更可靠的解释。",
      "sourceTitle": "湖南省南岳衡山自然保护区",
      "sourceUrl": "https://lyj.hunan.gov.cn/lyj/ztzl/gdzt/zrbhq/201512/t20151227_2587456.html"
    },
    {
      "id": "HN-ECOLOGY-4-10",
      "themeId": "ecology",
      "levelId": "ecology-4",
      "title": "假设某民宿甲日10人用水2000升，乙日5人用水1200升。哪日人均用水更少？",
      "options": [
        "乙日，240升每人",
        "乙日，因为总用水更少",
        "两日相同，都是200升每人",
        "甲日，200升每人"
      ],
      "answer": 3,
      "explanation": "甲2000÷10＝200，乙1200÷5＝240；比较总量会误导。",
      "sourceTitle": "南岳推动节水",
      "sourceUrl": "https://slt.hunan.gov.cn/xxgk/slxw/sxsl/202211/t20221125_29137952.html"
    }
  ]
};
