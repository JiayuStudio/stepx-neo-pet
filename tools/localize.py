from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'web/src'
# Translate presentation only. vendor/mori-game retains the exact upstream rules.
phrases={
'A tiny life that remembers how you care.':'一只会记住你如何照顾它的小生命。',
'Mori is brighter than the morning.':'点点今天闪闪发亮。','A tiny, happy hum fills the room.':'小世界里，响起开心的哼唱。',
'Mori keeps glancing toward the snacks.':'点点正望着零食发呆。','Those little eyelids are getting heavy.':'眼皮开始打架了。',
'Something feels a little out of tune.':'有点不开心，需要你陪陪。','Stay close. Mori needs gentle attention.':'靠近一点，点点需要照顾。',
'Munch · munch · happy crunch':'嚼呀嚼，吃饱啦','Bounce · spin · sparkle':'蹦蹦跳跳，一起玩','Shake · scrub · shine':'搓出泡泡，干干净净',
'Curl up · breathe · restore':'蜷起来，好好休息','Hold close · feel safe':'抱一抱，安心啦','Step out · look around':'出发，发现新东西',
'Quick hands, bright heart.':'伸出手，接住星星。','You have 12 seconds. Mouse, touch, and keyboard all work.':'在 12 秒内点击星星，获得星屑。',
'Catch as many falling memories as you can.':'尽可能接住闪亮的回忆。','Remember Mori’s five-symbol secret signal.':'记住点点发来的五个符号。',
'Watch. Remember. Repeat.':'看清楚，记下来，再重复。','The signal is visible for just a moment.':'符号只会显示短短一瞬。',
'Perfect signal!':'信号全部正确！','A clear memory—and 10 bonus Sparks.':'记得真清楚，获得 10 星屑。','The signal faded, but Mori loved trying with you.':'信号消失了，点点仍很喜欢和你一起尝试。',
'Warm rituals and close care':'温柔陪伴与细心照料','Games, movement, and surprise':'游戏、运动和惊喜','Discovery and thoughtful habits':'探索和用心的小习惯',
'Your next care action can shape growth.':'下一次照料会留下成长印记。','Care still helps Mori while the next imprint gathers.':'等待新印记时，照料仍然有效。',
'Every personality is a good path. Recent care gently changes which part of Mori shines brightest.':'每种性格都有自己的可爱之处。日常照料会慢慢影响点点的性格。',
'Your Bond, memories, and Sparks stay safe. This personality path begins from a fair shared starting point.':'亲密度、回忆和星屑都会保存在手机里。成长来自你们相处的每一天。',
'Cozy mode: Mori is safe, and the incident will wait.':'轻松模式：事件会等你，不会损伤健康。','Classic mode: Mori’s health slowly fades until you help.':'经典模式：未处理的事件会慢慢影响健康。',
'Device themes stay free. Arcade Sparks unlock optional keepsakes for Mori and the room.':'主题可以自由切换。小游戏赢得的星屑可用来兑换饰品和房间摆件。',
'Patient care leaves a warm, steady glow.':'耐心的照顾，让心里暖暖的。','Games and bright surprises make Mori sparkle.':'游戏和惊喜，让点点充满活力。','Discovery and thoughtful rituals open new paths.':'探索和小小仪式，会打开新的道路。',
'A fuzzy little storm is following Mori around the room.':'一团毛茸茸的小云跟着点点，需要一个拥抱。','Silver garden threads have wrapped around Mori’s paws.':'花园里的丝线缠住了小爪子，帮它洗干净吧。','A tiny signal is calling from just beyond the pocket world.':'远方传来微弱信号，带点点出去探索吧。',
'A bright bow for playful days.':'适合快乐日子的小蝴蝶结。','Two brave leaves grown from a memory.':'从回忆里长出的两片小叶子。','A quiet orbit worn close to the heart.':'把安静的小月亮戴在身边。','Keeps one soft story glowing nearby.':'留住一段温暖的故事。','A pocket patch of impossible flowers.':'小小花园，开出想象中的花。','Catches sleepy signals above the room.':'在房间上方接住甜梦。',
'This is Mori. Start with a hello.':'这是点点，先打个招呼吧。','Mori reacts to your care, remembers story choices, and grows differently based on the life you share.':'点点会回应照料，记住故事里的选择，陪你一起成长。','Tap Mori inside the screen anytime for a quick play session.':'轻点画面里的点点，就能陪它玩耍。',
'Five little meters tell the whole story.':'五个状态，读懂它的心情。','Full, Joy, Clean, Rest, and Health drift over real time. Low signals change Mori’s mood and animation.':'饱食、心情、清洁、精力和健康会随时间变化，也影响点点的表情与动作。','Cozy mode is forgiving. Classic mode keeps the old-school consequences.':'日常陪伴推荐轻松模式。经典模式需要更勤快地照料。',
'Every action shapes a different day.':'每一次照料，都让今天不同。','Feed, play, wash, rest, cuddle, or explore. Actions trade one need for another, so follow Mori’s signals.':'喂食、陪玩、洗澡、休息、拥抱或探索。跟随点点的状态做选择。','Stories unlock as your bond grows. Your answers influence future evolution.':'亲密度提升会解锁回忆，你的选择会影响性格和成长。',
'Play, collect Sparks, return tomorrow.':'玩游戏，收集星屑，明天再见。','Mini-games raise Joy and Bond. Build a daily streak, chase your best score, and switch shells to enter new worlds.':'小游戏提升心情和亲密度。赢得星屑后，可以装饰点点和房间。','Press the music note for an original looping pocket-console tune.':'点击音符可播放音乐。返回桌面后音乐会停止。',
'Every shell changes the room inside—not just the color outside.':'换一个外壳，也换一个生活的小世界。','Your choices shape Mori\'s future evolution.':'你的选择，会影响点点未来的成长。',
'Petals remember every promise.':'花瓣记得每一个约定。','A tiny signal from tomorrow.':'来自明天的小小信号。','Slow mornings grow wild things.':'慢慢醒来的清晨，草木自由生长。','Dreams orbit close to home.':'梦在家的附近环绕。',
'Something is tapping from inside the shell…':'外壳里面，传来了轻轻的敲击声……','Two bright eyes appear. The little creature waits for the first sound of its new life.':'两只明亮的眼睛出现了。小生命正等待新生活里的第一声问候。','Hum a soft hello':'轻轻哼一声你好','Mori sways to the tune and remembers it.':'点点跟着旋律摇晃，把它记在了心里。','Tap back twice':'轻敲两下回应','Tap. Tap. A secret greeting is born.':'嗒，嗒。你们有了秘密的问候。',
'A tiny light falls from the sky.':'一小点光，从天空落下来。','Mori cups the flickering spark. It could warm the room—or guide another creature home.':'点点捧着微弱的光。它可以温暖房间，也可以照亮别人回家的路。','Hang it by the window':'把它挂在窗边','The room glows like a remembered summer.':'房间亮起来，像记忆里的夏天。','Send it home':'送它回家','Far away, another pocket world blinks thank you.':'远处的另一个小世界，闪烁着向你道谢。',
'The rain has forgotten its rhythm.':'雨滴忘记了自己的节奏。','Drops hover silently above the garden. Mori looks to you for the missing beat.':'雨滴静静悬在花园上方，点点望着你，寻找丢失的节拍。','Dance the rhythm':'跳出节奏','The rain tumbles down in a laughing chorus.':'雨滴笑着落下，唱成一首歌。','Listen together':'一起静静听','In the quiet, the rain finds its own song.':'安静中，雨找回了自己的旋律。',
'A folded flower will not open.':'一朵折纸花，怎么也不肯展开。','Mori found it tucked under the room’s floorboards. The creases still remember another pair of hands.':'点点在地板下找到它，折痕还记着另一双手的温度。','Fold a friend for it':'给它折一个朋友','Two paper flowers lean together and finally bloom.':'两朵纸花靠在一起，终于绽开了。','Trace every crease':'沿着折痕慢慢看','Mori learns the old pattern and keeps it safe.':'点点学会了旧图样，好好收藏起来。','Warm it patiently':'耐心暖一暖它','Held close, the paper softens and opens on its own.':'靠近心口，纸慢慢变软，自己展开了。',
'A voice from an older pocket world.':'旧日的小世界，传来一个声音。','The device hums with a message recorded long before Mori hatched. It is asking whether anyone is still listening.':'设备响起很久以前录下的消息：还有人在听吗？','Answer with your song':'用你们的歌回应','Mori sends back the very first hum you shared.':'点点送回了你们相遇时的第一段旋律。','Map where it came from':'找出声音来自哪里','Mori sketches a route toward a world nobody has visited.':'点点画出路线，通向无人去过的小世界。','Reply in secret taps':'用秘密敲击回应','Tap. Tap. The old signal laughs and taps back.':'嗒，嗒。旧信号笑着，轻轻敲了回来。',
}
short={
'Feed':'喂食','Play':'陪玩','Wash':'洗澡','Rest':'休息','Cuddle':'拥抱','Explore':'探索','+ hunger':'+ 饱食','+ joy':'+ 心情','+ hygiene':'+ 清洁','+ energy':'+ 精力','+ bond':'+ 亲密','+ discovery':'+ 发现',
'Full':'饱食','Joy':'心情','Clean':'清洁','Health':'健康','SNACK TIME!':'开饭啦！','ZOOMIES!':'动起来！','BUBBLE BATH!':'泡泡浴！','DREAM MODE':'甜梦时间','BIG CUDDLE!':'抱抱！','ADVENTURE!':'出发探索！',
'GLOWING':'闪闪发亮','CONTENT':'心满意足','PECKISH':'有点饿啦','DROWSY':'困困的','FUSSY':'有点烦躁','NEEDS CARE':'需要照顾',
'Gentle':'温柔','Playful':'活泼','Curious':'好奇','Seedling':'幼苗期','Bloom':'绽放期','Luminary':'星光期','A Static Cloud':'静电小云','The Tangled Sprout':'缠绕的小芽','A Wandering Signal':'远方的信号',
'Star Ribbon':'星星丝带','Sprout Crown':'嫩芽王冠','Moon Charm':'月亮挂饰','Memory Lantern':'回忆灯笼','Tiny Garden':'袖珍花园','Dream Mobile':'甜梦风铃',
'Sakura Pocket':'樱花小屋','Neon Byte':'霓虹空间','Moss Shell':'苔藓森林','Moon Milk':'月光之屋',
'Star Catch':'接星星','Signal Memory':'记忆信号','Circle':'圆形','Triangle':'三角','Square':'方块','Star':'星星','START ROUND':'开始挑战','PLAY AGAIN':'再玩一次','SHOW SIGNAL':'显示信号','TRY AGAIN':'再试一次','YOUR SIGNAL…':'你的信号……',
'CARE IMPRINT READY':'可以留下成长印记','CARE IMPRINT RESTING':'成长印记蓄积中','FULL GLOW':'成长已圆满','EQUIPPED · REMOVE':'已装备 · 卸下','OWNED · EQUIP':'已拥有 · 装备',
'A SMALL BEGINNING':'小小的开始','STORY 01 · THE LOST LIGHT':'回忆 01 · 遗落的光','STORY 02 · RAIN MUSIC':'回忆 02 · 雨的旋律','STORY 03 · THE PAPER GARDEN':'回忆 03 · 折纸花园','STORY 04 · THE LONG SIGNAL':'回忆 04 · 遥远的信号',
'MEET YOUR POCKET PAL':'认识你的口袋伙伴','READ THE SIGNALS':'读懂状态','CARE & CONNECT':'照料与陪伴','MAKE IT A RITUAL':'留下日常的小仪式','ENTER MY WORLD':'进入小世界','NEXT':'下一步','BACK':'上一步',
'MORI’S SIGNAL':'点点的心声','MEMORY SAVED':'回忆已保存','ARCADE SIGNAL':'游戏收获','WORKSHOP':'装饰工坊','ALL MEMORIES FOUND':'所有回忆已收集','OPEN NEXT MEMORY':'打开下一段回忆','RESCUE · TRY THIS':'试试这个 · 帮助它',
'Close game':'关闭游戏','Catch star':'接住星星','Close story':'关闭回忆','Open tutorial':'查看教程','Music on':'音乐已开启','Play music':'播放音乐','Stop nostalgic music':'停止音乐','Play nostalgic music':'播放音乐',
}
jsx={
'TAMA<br />GOCHI':'点点<br />MORI','LOCAL SAVE':'本机存档','Meet<br />':'你好，<br />','ONLINE':'陪伴中','WAKING UP…':'正在醒来……','PLAY WITH MORI':'和点点玩','TODAY\'S SIGNAL':'今天的状态','COZY':'轻松','CLASSIC':'经典','BOND':'亲密度',
'Tiny games.<br /><em>Real rituals.</em>':'小小的游戏，<br /><em>每天的快乐。</em>','Mori’s Growth<br /><em>Studio.</em>':'点点的<br /><em>成长手帐。</em>','LIVING EVOLUTION · LOCAL & PRIVATE':'成长与性格','CURRENT FORM':'当前形态','POCKET INCIDENT · NEEDS YOU':'小事件 · 需要你','GO TO CARE ↑':'去照料 ↑','SPARK WORKSHOP':'星屑工坊','Earned keepsakes.':'兑换小小收藏。','DEVICE COLLECTION':'选择小世界','One friend.<br /><em>Many worlds.</em>':'一个朋友，<br /><em>许多小世界。</em>','SKIP TOUR':'跳过教程','TIP':'提示','TAMAGOCHI ARCADE · OPEN DAILY':'点点游乐场 · 每日开放','TAMAGOCHI ARCADE':'点点游乐场','REACTION · 12 SEC':'反应 · 12 秒','MEMORY · 1 MIN':'记忆 · 1 分钟','PLAY →':'去玩 →',
}
for p in root.rglob('*'):
 if p.suffix not in ['.ts','.tsx'] or p.name in ['store.ts','mori-store.ts','zh.ts']:continue
 s=p.read_text()
 for a,b in sorted(phrases.items(),key=lambda x:-len(x[0])):s=s.replace(a,b)
 for a,b in short.items():
  s=s.replace("'"+a+"'","'"+b+"'").replace('"'+a+'"','"'+b+'"')
 for a,b in jsx.items():s=s.replace('>'+a+'<','>'+b+'<')
 s=s.replace('Best score {','最高分 {').replace('UNLOCK · {','兑换 · {').replace('Need {shortfall} more Sparks','还需 {shortfall} 星屑').replace('{item.cost} SPARKS','{item.cost} 星屑').replace('{sparks} SPARKS','{sparks} 星屑').replace('{game.sparks} SPARKS','{game.sparks} 星屑').replace('{streak} DAY STREAK','{streak} 天连续').replace('{game.playStreak} DAY','{game.playStreak} 天').replace('AGE {ageLabel}','年龄 {ageLabel}').replace('TIME <b>','时间 <b>').replace('SCORE <b>','得分 <b>')
 s=s.replace('`${score} memories caught!`','`接住了 ${score} 颗星星！`').replace('`Mori earned ${Math.max(3, Math.floor(score / 2))} Sparks.`','`点点获得 ${Math.max(3, Math.floor(score / 2))} 星屑。`').replace('`${picks.length} symbols remembered`','`记住了 ${Math.max(0,picks.length-1)} 个符号`')
 s=s.replace('`NEXT MEMORY AT ${storyRequirement}% BOND`','`亲密度 ${storyRequirement}% 解锁下一段回忆`').replace('`${growth.remaining} TO GO`','`还需 ${growth.remaining} 成长`').replace(' · COMPLETE',' · 已完成')
 s=s.replace('{personality.toUpperCase()} SOUL',"{({gentle:'温柔',playful:'活泼',curious:'好奇'})[personality]}性格")
 s=s.replace('{item.category.toUpperCase()}',"{item.category === 'wearable' ? '饰品' : '摆件'}")
 s=s.replace('Try {titleCase(incident.action)}.',"试试{({feed:'喂食',play:'陪玩',wash:'洗澡',rest:'休息',cuddle:'拥抱',explore:'探索'})[incident.action]}。")
 s=s.replace('const titleCase = (value: string) => `${value[0].toUpperCase()}${value.slice(1)}`','')
 p.write_text(s)
# Story choice replies are emitted by the unmodified engine; translate them at the boundary.
p=root/'zh.ts';s=p.read_text();catalog={k:v for k,v in phrases.items() if k in (Path(__file__).resolve().parents[1]/'vendor/mori-game/stories.ts').read_text()}
s=s.replace('if(!text) return null', 'if(!text) return null\n  const translations: Record<string,string> = '+json.dumps(catalog,ensure_ascii=False)+'\n  for (const [a,b] of Object.entries(translations)) text=text.replace(a,b)')
p.write_text(s)
