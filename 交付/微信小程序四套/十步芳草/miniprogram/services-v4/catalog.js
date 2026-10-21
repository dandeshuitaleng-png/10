/* No authored questions or answers in a network player. */
module.exports={
  "name": "趣味闯关",
  "subtitle": "乡村文化知识探索",
  "timerSeconds": 30,
  "reviveLimit": 1,
  "themeNamesSource": "现有工程目录",
  "themes": [
    {
      "id": "red",
      "name": "十步芳草",
      "order": 2,
      "enabled": true,
      "description": "在乡音与古建中读懂湖南",
      "certificateName": "千年文脉知识达人"
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
    }
  ],
  "questions": []
};
