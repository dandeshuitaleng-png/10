/* No authored questions or answers in a network player. */
module.exports={
  "name": "趣味闯关",
  "subtitle": "乡村文化知识探索",
  "timerSeconds": 30,
  "reviveLimit": 1,
  "themeNamesSource": "现有工程目录",
  "themes": [
    {
      "id": "industry",
      "name": "金色产业",
      "order": 2,
      "enabled": true,
      "description": "在乡音与古建中读懂湖南",
      "certificateName": "知识达人"
    }
  ],
  "levels": [
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
    }
  ],
  "questions": []
};
