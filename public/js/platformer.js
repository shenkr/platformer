var requestAnimFrame = (function(){
    return window.requestAnimationFrame    ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame
})();
// Varibles //
var
  game = {
    screen: {
      offset: {
        old: {
          x: 0,
          y: 0
        },
        x: 0,
        y: 0
      }
    }
  },
  tile = 64;
  canvas = document.getElementById('main').appendChild(document.createElement('canvas'));
  canvas.id = 'canvas';
  canvas.width = 14 * tile;
  canvas.height = 6 * tile;

  ctx = canvas.getContext("2d");

  img = new Image();
  img.src = 'img.png';


  bufferCanvas = document.getElementById('main').appendChild(document.createElement('canvas'));
  bufferCanvas.width = canvas.width;
  bufferCanvas.height = 100;

  buffer = bufferCanvas.getContext("2d");
  
  MAP = {
    cell: function(cell) { //position on canvas
      return {
        x: cell % 20 * tile,
        y: ((cell / 20) | 0) * tile,
        w: tile,
        h: tile,
        r: (cell / 20) | 0,
        c: cell % 20
      }
    },
    tile: function(tile) { //position on tileset
      return {
        x: ((tile - 1) % 9) * tile,
        y: (((tile - 1) / 9) | 0) * tile,
        r: ((tile - 1) / 9) | 0,
        c: (tile - 1) % 9
      }
    }
  }

  enemies = [];
  bullets = [{x: 10, y: 10, velocity: {x:1,y:0}, time: Date.now()}];


function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y
}

var keys = [];


var last;

function init() {
  last = Date.now();
  main();
}

function main() {
    var now = Date.now();
    var dt = (now - last) / 1000.0;

    update(dt);
    render();

    last = now;
    requestAnimFrame(main);
}
// SETUP //
function setup(map) {
  var layers = map.layers, object;
  //prepare the map
  for(n = 0; n < layers.length; n++) {
    layer = layers[n];
    switch(layer.name) {
      //layers
      case "Wall": MAP.wall = layer.data; break;
      case "Background": MAP.background = layer.data; break;
      case "Foreground": MAP.foreground = layer.data; break;
      case "Collision": MAP.collision = layer.data; break;
      //objects
      case "Objects":
        for(n = 0; n < layer.objects.length; n++) {
          object = layer.objects[n];
          entity = setupEntity(object);
          switch(object.type) {
            case "player": player = entity; break;
            case "enemy": enemies.push(entity); break;
          }
        }
      break;
    }
  }
  console.log(map);
}

function setupEntity(object) {
  var entity = {
    x: object.x,
    y: object.y,
    w: object.width,
    h: object.height,
    velocity: {
      x: 0,
      y: 0
    },
    type: object.type,
    speed: 170,
    onFloor: false,
    face: object.properties.face,
    behavior: "walk",
    sprite: {},
    rect: {},
    damage: false
  }
  switch(object.name) {
    case "Player":
      entity.sprite = {
        idle: new Sprite('img/player.png', [64, 64], [64, 64]),
        walk: new Sprite('img/player.png', [0, 0], [64, 64], 6, [0, 1, 2, 1]),
        jump: new Sprite('img/player.png', [0, 64], [64, 64]),
        shoot: new Sprite('img/player.png', [64*3, 0], [64, 64]) 
      }
      entity.tile = { x: 12, y: 0, w: 40, h: 0 }
      entity.offset = { old: { x: 0, y: 0}, x: 0, y: 0 }
    break;
    case "Slime":
      entity.sprite = {
        idle: new Sprite('img/enemies.png', [0, 0], [64, 64]),
        walk: new Sprite('img/enemies.png', [0, 0], [64, 64], 6, [0, 1, 2, 1]),
        jump: new Sprite('img/enemies.png', [0, 0], [64, 64]) 
      }
      entity.tile = { x: 4, y: 0, w: 56, h: 0 }
      switch(entity.face) {
        case "left": entity.velocity.x = 12;
        case "right": entity.velocity.x = -1; 
      }
    break;
  }

  return entity;
}



// UPDATING //
function update(dt) {
  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt);
}

function updateEntity(entity, dt) {
  //sprite
  switch(entity.face) {
    case "left":
      entity.sprite[entity.behavior].flip = true;
      if(entity.velocity.x > 0) entity.velocity.x = -entity.velocity.x;
    break;
    case "right":
      entity.sprite[entity.behavior].flip = false;
      if(entity.velocity.x < 0) entity.velocity.x = -entity.velocity.x;
    break;
  }

  entity.sprite[entity.behavior].update(dt);
  //enity rectangle
  entity.rect.x = entity.x + entity.tile.x;
  entity.rect.y = entity.y + entity.tile.y;
  entity.rect.w = entity.tile.w;
  entity.rect.h = entity.h + entity.tile.h;

  if(entity.behavior == "jump") {
    entity.rect.y = entity.y - 0;
  }

  entity.velocity.y += 0.4;

  var expectedY = entity.y + entity.velocity.y;

  //overlap test
  for (var i = 0; i < MAP.collision.length; i++) {
    var cell = MAP.cell(i);
    var next = MAP.cell(i+1);

    if(MAP.collision[i] != 0) {
      var temp = { x: entity.rect.x + entity.velocity.x, y: entity.rect.y, w: entity.rect.w, h: entity.rect.h }

      if(overlap(temp, cell)) {
        if(entity.velocity.x > 0) {
          if(entity.type != 'player') {
            entity.face = "left"
            entity.tile.x = 0;
          }
          else entity.velocity.x = cell.x - entity.rect.x - entity.rect.w;
        }
        else if(entity.velocity.x < 0) {
          if(entity.type != 'player') {
            entity.face = "right";
            entity.tile.x = 8;
          }
          else entity.velocity.x = cell.x + cell.w - entity.rect.x;
        }
      }
      var temp = { x: entity.rect.x, y: entity.rect.y + entity.velocity.y, w: entity.rect.w, h: entity.rect.h }

      if(overlap(temp, cell)) {
        if(entity.velocity.y >= 0) {
          entity.velocity.y = cell.y - entity.y - entity.h;
            if(MAP.collision[i+1] == 0 || MAP.collision[i-1] == 0) {
            }
        }
        else if(entity.velocity.y < 0) entity.velocity.y = cell.y + cell.h - entity.y;
      }
    }
  }

  entity.x += entity.velocity.x;
  entity.y += entity.velocity.y;

  entity.onFloor = (expectedY > entity.y)
  if (expectedY != entity.y) entity.velocity.y = 0
}

function updatePlayer(dt) {
    //offset
  if((player.x + player.w / 2) > 384) {
    player.offset.x = ((player.x + player.w / 2) - 384);
    if(player.offset.x != player.offset.old.x) ctx.translate(player.offset.old.x - player.offset.x, 0);
    player.offset.old.x = player.offset.x;
  }

  if((keys[87] || keys[83] || keys[68] || keys[65]) && player.onFloor) player.behavior = "walk";

  if(!keys[87] && !keys[83] && !keys[68] && !keys[65] && !keys[32]) player.behavior = "idle";

  if(player.onFloor && keys[32]) {
    player.rect.y -= 10;
    player.velocity.y = -11;
    player.behavior = "jump";
  }
  //shoot
  if(keys[90]) {
    player.behavior = "shoot";

    if((Date.now() - bullets[bullets.length-1].time) > 500) {
      bullets.push({
        x: player.x + 60,
        y: player.y + 32,
        velocity: {
          x: player.face == "right" ? 1 : -1,
          y: 0
        },
        time: Date.now() 
      });
    }
  }

  if(keys[68]) player.face = "right";
  if(keys[65]) player.face = "left";

  
  player.velocity.x = 3 * (!!keys[68] - !!keys[65]);
  updateEntity(player, dt);


}

function updateEnemies(dt) {
  for(n = 0; n < enemies.length; n++) {
    updateEmeny(enemies[n], dt);
  }
}

function updateEmeny(enemy, dt) {
  //overlap with player
  if(overlap(enemy, player)) {
    player.damage = true;
  }

  updateEntity(enemy, dt);
}

function updateBullets(dt) {
  for(i = 0; i < bullets.length; i++) {
    var bullet = bullets[i]
    
    bullet.x += 400 * dt * bullet.velocity.x;
  }  
}

// RENDERING //

function render() {
  ctx.clearRect(player.offset.x, 0, canvas.width + player.offset.x, canvas.height);

  renderLayer('wall');
  renderLayer('background');

  renderBullets();
  renderPlayer();
  renderEnemies();

  renderLayer('foreground');
  renderLayer('collision');

  //ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  //ctx.fillRect(player.x + player.w * 0.1875, player.y, player.w * 0.625, player.h);
};

function renderLayer(layer) {
  for(n = 0; n < MAP[layer].length; n++) {
    ctx.drawImage(
      resources.get('img/tileset.png'),
      MAP.tile(MAP[layer][n]).c * tile, MAP.tile(MAP[layer][n]).r * tile,
      tile, tile,
      MAP.cell(n).x, MAP.cell(n).y,
      tile, tile
    );
  }
}

function renderEntity(entity) {

  ctx.save();

  ctx.translate(entity.x, entity.y);
  entity.sprite[entity.behavior].render(ctx);
  

  ctx.restore();
  //draw rectangle
  //ctx.fillStyle = "grey";
  //ctx.fillRect(entity.rect.x, entity.rect.y, entity.rect.w, entity.rect.h);

  if(player.damage) {
    buffer.save();

    player.sprite[player.behavior].render(buffer);

    buffer.globalCompositeOperation = "source-in";
    buffer.fillStyle = "rgba(255, 0, 0, 0.1)";
    buffer.fillRect(0, 0, 170, 170);
    buffer.restore();
 
    ctx.drawImage(bufferCanvas, player.x, player.y);
  }
}

function renderPlayer() {
  renderEntity(player);
}
function renderEnemies() {
  for(n = 0; n < enemies.length; n++) {
    renderEntity(enemies[n]);
  }
}

function renderBullets() {
  ctx.fillStyle = "grey";
  for(i = 0; i < bullets.length; i++) {
    ctx.fillRect(bullets[i].x, bullets[i].y, 4, 4);
  }
}

get('map.json', function(req) {
  setup(JSON.parse(req.responseText));
});

resources.load([
  'img/player.png',
  'img/tileset.png',
  'img/enemies.png'
]);

resources.onReady(init);

addEventListener("keydown", function(event) {
  keys[event.keyCode] = true;
});

addEventListener("keyup", function(event) {
  keys[event.keyCode] = false;
  player.sprite[player.behavior]._index = 0;
});

function get(url, onsuccess) {
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if(request.readyState == 4 && request.status == 200) {
      onsuccess(request);
    }
  }
  request.open("GET", url, true);
  request.send();
}