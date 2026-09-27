import {diagonalFov,symmetricProfile} from './fov-math.js';
export const VERIFIED_AT='2026-09-25';
// SDK visible targets, per-eye render extent, and panel pixels are distinct.
export const META_SDK_PROFILE={
 verifiedAt:'2026-09-27',source:'https://developers.meta.com/horizon/essentials/field-of-view/',
 visible:{h:70,v:66,unit:'deg',status:'official',qualifier:'nominal straight-ahead upper bound'},
 renderExtent:{h:74,v:68,unit:'deg',scope:'per-eye',status:'official',note:'Rendering extent, not visible UI bounds'},
 panel:{width:2412,height:2288,unit:'px',scope:'per-eye',status:'official'},
 implementation:'The website uses its own WebXR angular overlay; it does not embed IWSDK or apply the OS override.',
};
export const REVIEW_URL='https://skarredghost.com/2026/08/27/xreal-aura-hands-on-impressions/';
export const SOURCES={
 aura:'https://www.xreal.com/aura',
 auraDetail:'https://resource.xreal.com/www-xreal-com/images/aura/aura-91g-glasses-style-ar-eyewear.webp',
 auraSide:'https://resource.xreal.com/www-xreal-com/images/aura/xreal-aura-eyewear-compute-puck.webp',
 auraFront:'https://resource.xreal.com/www-xreal-com/images/aura/aura-electrochromic-dimming.webp',
 auraRear:'https://resource.xreal.com/www-xreal-com/images/aura/aura-optical-see-through-design.webp',
 auraSocial:'https://resource.xreal.com/www-xreal-com/images/aura/aura-eyes-visible-social-presence.webp',
 auraPresence:'https://resource.xreal.com/www-xreal-com/images/aura/technology-presence-see-through.webp',
 auraInside:'https://i0.wp.com/skarredghost.com/wp-content/uploads/2026/08/20260618_133157.jpg?resize=640%2C480&ssl=1',
 auraTop:'https://i0.wp.com/skarredghost.com/wp-content/uploads/2026/08/20260618_133223.jpg?resize=640%2C480&ssl=1',
 auraBottom:'https://i0.wp.com/skarredghost.com/wp-content/uploads/2026/08/20260618_133228.jpg?resize=640%2C480&ssl=1',
 meta:'https://about.fb.com/news/2026/09/introducing-meta-vr-glasses-3d-movies-immersive-live-sports-100-grams/'
};
const evidence=(status,source,confidence='medium',extra={})=>({status,source,verifiedAt:VERIFIED_AT,confidence,...extra});
const fov=(value,axis,source,status='official')=>({value,unit:'deg',axis,scope:'unknown',...evidence(status,source,status==='official'?'high':'low'),scopeNote:'来源未明确单眼/双眼测量范围；用于单眼相对角域示意，不视作单眼实测。'});
const rect={status:'assumed',projection:'symmetric-rectilinear',effectiveAspect:'以面板比例代替有效图像比例；未取得实际可见轮廓'};
export const DEVICES=[
 {id:'meta',name:'VR Glasses',short:'VR Glasses',color:'#397eaa',kind:'VR / MR',basis:'官方 H/V 上限',source:'Meta 开发文档',url:'https://developers.meta.com/horizon/essentials/field-of-view/',initial:true,
  fov:fov({h:70,v:66},'horizontal-vertical','https://developers.meta.com/horizon/essentials/field-of-view/'),shape:{...rect},note:'官方 H/V 上限，非每位用户的可见范围。眼盒与左右独立投影未知。'},
 {id:'aura',name:'XREAL AURA',short:'AURA',color:'#b47a21',kind:'光学 AR',basis:'官方 70°；轴向未注明',source:'XREAL 官方 + 评测记载',url:SOURCES.aura,initial:true,
  fov:{...fov(70,'unknown',SOURCES.aura),verifiedAt:'2026-09-28'},shape:{...rect,ratio:1.6,ratioEvidence:evidence('assumed',SOURCES.aura,'low',{verifiedAt:'2026-09-28',note:'16:10 来自 1920 × 1200 面板像素比例。将此比例用于可见光学画幅是本站假设，官网未确认光学 H/V 或双眼重叠。'}),axis:'diagonal',axisEvidence:evidence('assumed',REVIEW_URL,'medium',{note:'评测记载对角 70°，没有测量方法；不是实测 FOV。'})},
  resolution:{value:[1920,1200],scope:'per-eye',unit:'px',...evidence('official',SOURCES.aura,'high')},refreshRate:{value:120,qualifier:'up to',unit:'Hz',...evidence('official',SOURCES.aura,'high')},
  dimmingLevels:{value:5,...evidence('official',SOURCES.aura,'high')},transmittance:{value:null,status:'unknown'},pwm:{value:null,status:'unknown'},
  note:'仅供教学示意。官网标称 70° FOV，未标明轴向。本站默认采用评测记载的对角解释，并假设光学画幅与 1920 × 1200 面板一样为 16:10，以此换算 H/V；光学画幅未获确认。双眼数据未获确认，本站不推算逐眼范围或重叠比例。'},
 {id:'quest3',name:'Meta Quest 3',short:'Quest 3',color:'#668a48',kind:'VR / MR',basis:'官方 H/V',source:'Meta 设备规格',url:'https://developers.meta.com/horizon/resources/compare-devices/',initial:true,
  fov:fov({h:110,v:96},'horizontal-vertical','https://developers.meta.com/horizon/resources/compare-devices/'),shape:{...rect},note:'官方 H/V；此来源未明确左右眼独立范围，不据此推算双目重叠。'},
 {id:'vision',name:'Apple Vision Pro',short:'Vision Pro',color:'#9272ac',kind:'VR / MR',basis:'第三方建模估计',source:'HyperVision 光学分析',url:'https://www.hypervision.ai/tech-research/apple-vp-optics-insights',initial:true,estimated:true,rangeH:[100,110],
  fov:fov({h:105,v:90},'horizontal-vertical','https://www.hypervision.ai/tech-research/apple-vp-optics-insights','assumed'),shape:{...rect},note:'首代光学模型估计：H 100–110°、V 约 90°。图中中值是演示选择；不是 Apple 规格或实机测量。'},
 {id:'beast',name:'VITURE Beast',short:'Beast',color:'#518d8d',kind:'光学 AR',basis:'官方对角；矩形换算',source:'VITURE 光学说明',url:'https://www.viture.com/blog/engineered-reality-01-the-biggest-brightest-xr-glasses-how-viture-beast-works',
  fov:fov(58,'diagonal','https://www.viture.com/blog/engineered-reality-01-the-biggest-brightest-xr-glasses-how-viture-beast-works'),shape:{...rect,ratio:1.6,ratioSource:'https://www.viture.com/academy/xr-glasses/the-beast'},note:'58° 对角为官方声明。H/V 按面板 16:10 理想矩形换算，非真实光学轮廓。'},
 {id:'1s',name:'XREAL 1S',short:'1S',color:'#977347',kind:'光学 AR',basis:'官方数值；轴向未知',source:'XREAL 官方规格',url:'https://tutorials.xreal.com/docs/glasses/one-series/spec/',
  fov:fov(52,'unknown','https://tutorials.xreal.com/docs/glasses/one-series/spec/'),shape:{...rect,ratio:1.6},note:'官方 52°，面板单眼比例按双目 3840 × 1200 推算。默认按对角假设模拟 H/V，以虚线绘制；可关闭估算。'},
 {id:'onepro',name:'XREAL One Pro',short:'One Pro',color:'#697db6',kind:'光学 AR',basis:'官方数值；轴向未知',source:'XREAL 官方规格',url:'https://tutorials.xreal.com/docs/glasses/one-series/spec/',
  fov:fov(57,'unknown','https://tutorials.xreal.com/docs/glasses/one-series/spec/'),shape:{...rect,ratio:16/9},note:'官方 57°，单眼比例按双目 3840 × 1080 推算。默认按对角假设模拟 H/V，以虚线绘制；可关闭估算。'}
];
export function deviceFov(device,assumption='diagonal',allowUnknownAxes=false) {
 const d=typeof device==='string'?DEVICES.find(d=>d.id===device):device;
 if(!d)throw new Error('Unknown device');
 const raw=d.fov;let result,axisAssumed=false;
 if(raw.axis==='horizontal-vertical')result=symmetricProfile(raw.value.h,raw.value.v);
 else {
  if(raw.axis==='unknown'&&d.id!=='aura'&&!allowUnknownAxes)return null;
  axisAssumed=raw.axis==='unknown';
  result=d.id==='aura'&&assumption==='horizontal'?{h:raw.value,v:2*Math.atan(Math.tan(raw.value*Math.PI/360)/d.shape.ratio)*180/Math.PI}:diagonalFov(raw.value,d.shape.ratio);
  result={...symmetricProfile(result.h,result.v),...result};
 }
 const formula=raw.axis==='horizontal-vertical'?'H/V from source':d.id==='aura'&&assumption==='horizontal'?'H=A; V=2 atan(tan(H/2) / r)':'H=2 atan(tan(D/2) r / √(r²+1)); V=2 atan(tan(D/2) / √(r²+1))';
 return {...result,unit:'deg',axis:'horizontal-vertical',status:raw.axis==='horizontal-vertical'?raw.status:'derived',axisAssumed,scope:raw.scope,source:raw.source,confidence:axisAssumed||raw.status==='assumed'?'low':raw.axis==='horizontal-vertical'?raw.confidence:'medium',inputs:raw.axis==='horizontal-vertical'?raw.value:{angle:raw.value,axis:axisAssumed&&d.id==='aura'?assumption:raw.axis==='unknown'?'diagonal':raw.axis,ratio:d.shape.ratio},formula,verifiedAt:VERIFIED_AT};
}
// Scene coordinates are metres. Authoring coordinates are normalized shape ratios,
// scaled once at the common root. 0.1 m per authoring unit is a display convention,
// NOT inferred product dimensions. UI uses normalized ratios, never alleged millimetres.
export const MODEL_WORLD_SCALE=.1;
export const ROOT_Z=.32;
export const physicalGeometry={
 meta:{frameHeight:.64,frameWidth:1.64,eye:{x:.365,y:.060,z:-.060},status:'assumed',confidence:'low',references:[{url:SOURCES.meta,view:'inner/front'}]},
 aura:{frameHeight:.655,frameWidth:1.63,eye:{x:.350,y:.075,z:-.150},
  outer:{x:.435,y:-.033,z:.02,w:.742,h:.490,frameW:.827,frameH:.571,upperLift:.100,wrap:.18,contour:'continuous front sunglass surface; raised upper rim encloses the rear electronics'},
  internal:{x:.330,y:.144-.258/2,z:-.047,w:.530,h:.258,depth:.110,housingW:.587,housingH:.348,housingDepth:.125},
  prescription:{x:.365,y:-.040,z:-.267,w:.615,h:.302,radius:.085,rimWidth:.007,mount:'short arms on nose-pad pivots, behind the optical assembly',status:'assumed'},
  nosePad:{center:[.112,-.158,-.211],half:[.048,.098,.018],tilt:16,hinge:[.133,-.133,-.179],attachment:[.147,-.086,-.120],source:SOURCES.auraPresence,status:'assumed',note:'官方内侧图中的扁平椭圆鼻垫，以短支座接在鼻侧下部，向下时略向镜片外侧倾斜；照片估计。'},
  status:'assumed',confidence:'low',references:[{url:SOURCES.auraSocial,view:'front: continuous outer lens in front of the internal prism'},{url:SOURCES.auraPresence,view:'inner close-up: four surrounding margins and upper housing'},{url:SOURCES.auraFront,view:'front lens/rim contour'},{url:SOURCES.auraRear,view:'inner brow and lens proportions'},{url:SOURCES.auraSide,view:'side and flat temple profile'},{url:SOURCES.auraDetail,view:'front oblique detail'},{url:SOURCES.auraInside,view:'inner oblique'}],
  calibration:{status:'assumed',method:'normalized photo proportions, no physical dimensions',rearProtrusionOverFrameHeight:[.18,.28],internalWidthOverOuterFrameWidth:[.58,.70],presencePhoto:{source:SOURCES.auraPresence,clearAspect:[1.9,2.2],projectedUpperHousingOverClearHeight:[.95,1.2],lowerClearBandOverClearHeight:[.40,.65],temporalClearBandOverClearWidth:[.25,.35]},note:'以官方内侧特写与正面图共同校对。斜视上壳高度包含前后深度的投影，不直接当作正面 Y 高度。棱镜接黑壳、鼻侧相接；整个内组件在弯曲外片后。照片比例为估计，不是实物测量或眼位投影。'}
 }
};
export const RENDER_ASSUMPTIONS={
 observerCameraFov:{h:176,v:153,projection:'equidistant-angular',status:'assumed'},
 wearingCameraFov:{h:124,v:112,projection:'equidistant-angular',status:'assumed',note:'中央佩戴视角的屏幕取景，不是人眼总 FOV。所有设备同尺度放大；完整周边范围可切换。'},
 headsetBrowserPreview:{minH:120,minV:108,projection:'rectilinear',status:'assumed',note:'头显页的普通屏幕采用统一广角参考，相机随画布宽高比扩展其中一轴，不随设备目标缩放；不用于原生 WebXR 投影。'},
 humanField:{nasal:60,temporal:100,up:60,down:75,edge:[.995,1.005],status:'assumed',source:'https://www.ncbi.nlm.nih.gov/books/NBK220/',note:'文献角范围的简化椭圆；不是个人实测轮廓。'},
 virtualContentPose:{distance:3,cinemaWidth:2.6,cinemaHeight:1.463,unit:'scene-m',status:'assumed'},
 earthApp:{radius:24,center:[0,-1,-40],initialZoom:.85,hud:{width:3.3,height:2.0625,distance:3,wideScale:8.8/3.3},status:'assumed',note:'本站应用布局。完整界面默认放在三款均能看全的中央角域；周边展开用于观察空间内容裁切。地球大小和位置在设备间保持一致，不用物理镜片入口尺寸缩放虚拟屏幕。'},
 auraTransmission:{coefficients:[.85,.55,.30,.14,.10],space:'display-encoded',compositor:'bounded-screen',defaultLevel:5,status:'assumed',note:'普通屏幕上的背景亮度比例，不是物理透过率。房间与内容分别映射后采用有界滤色合成，避免直接相加造成高光截断；不是光度学标定。黑色不遮挡现实，显示亮度不随调光降低。第五档按用户指定的 90% 遮光效果演示，保留 10% 背景亮度；这是屏幕合成比例，不是硬件物理遮光率。各档硬件透过率与真实显示/环境亮度比未知。'},
 prescription:{pupilMm:4,virtualFocusM:2,status:'assumed'},
 viewExperience:{status:'assumed',note:'观看区独立估计镜杯、镜框、透光和夹片范围；AURA 夹片框与矫正范围共用同一轮廓，不复用产品模型或预测个人眼盒。'},
 wearing:{revision:'2026-09-28-compact-surrounds',status:'assumed',unit:'angular-deg',confidence:'low',edgeSoftness:.65,
  note:'为佩戴感选取的适中遮挡，不是实测眼位投影。x 正方向为颞侧，左右眼镜像；形状与显示 FOV 独立。',
  meta:{source:SOURCES.meta,references:['https://roadtovr.com/meta-vr-glass-hands-onconnect-2026/','https://i0.wp.com/roadtovr.com/wp-content/uploads/2026/09/vr-glasses-lenses.jpg','https://i0.wp.com/roadtovr.com/wp-content/uploads/2026/09/profile.jpg'],periphery:'open',evidence:'官方明确开放侧边；Road to VR 上手未使用可选遮光配件，记录了环境光影响。背面实拍有大面积连续织物与较小的圆润透镜入口；默认无遮光配件，主要前方被包裹遮住，下缘保留窄开口，使中央取景也能见到少量房间余光。角域为估计。',
   shell:{center:[0,11],half:[50,51],power:2.6,note:'收紧织物前罩的外侧与下缘，中央下缘约 -40°，保留连续布面及窄余光；独立于显示 FOV，不随宿主头显缩放。角域是教学估计，不是实测眼位投影。'},display:{half:[35,33],coordinates:'per-axis view angles',note:'围绕正前方 0° 对称的官方可见 H/V 包络；不是实体入口轮廓。观看区不画入口胶圈，也不按照片再裁显示角部。'},temple:{a:[57,28],b:[84,33],radius:2.7}},
  aura:{source:SOURCES.auraPresence,references:[SOURCES.auraInside,SOURCES.auraTop,SOURCES.auraBottom,SOURCES.auraSide],periphery:'open',evidence:'官方内侧特写显示：棱镜直顶紧接厚黑壳、鼻侧与支座相接；透明外片主要在下方和颞侧，下缘黑框也有明显厚度。该斜视照片不能直接测得佩戴者的观看角域，模拟仅保留结构关系。',
   lens:{center:[4.2,-3.4],half:[47,35.5],power:2.6,shear:.08,note:'外片在棱镜下方和颞侧保留透明带；收紧下缘与外侧，中央下框约 -40°，避免远大于显示范围的外片挤出头显取景。鼻侧仍贴支座，上缘藏在黑壳后。不是实测眼位投影，也不按宿主视野自动缩放。'},rimWidth:2.7,lowerRimWidth:4,
   upperOcclusion:{center:[6,60.5],half:[69,34],chamfer:3.4,note:'厚黑色显示组件壳体的底面直接接棱镜直顶边，不在两者之间留透明带；角域为估计。'},
   opticalCoordinates:'per-axis angular coordinates derived from each eye ray; straight front-facing edges in native perspective',
   optical:{center:[0,0],half:[37.5,26.5],topRadius:1.3,bottomRadius:6,note:'居中的直顶棱镜，横向由 84° 收至 75°，保留圆润下角和完整显示边界；不是实测棱镜角域。鼻侧安装位置不改变显示方向或 FOV。'},opticalHousing:{center:[0,.7],half:[40.5,30],topRadius:2,bottomRadius:8},nasalMount:{center:[-42,-1.7],half:[4.2,25.2],chamfer:2.5},
   prescription:{source:SOURCES.aura,status:'assumed',adjustable:false,note:'保留此前 110% 夹片及下移的轮廓关系，与收紧的佩戴结构一同缩至原角域的 88%。仍超出显示窗口，短支座挂在鼻托上。框体和矫正边界共用固定形状，桌面及 VR 一致；非实测覆盖。',
    lens:{center:[3.3088,-5.9136],half:[46.0768,31.1696],radius:13.552},rimWidth:1.89728,hanger:{a:[-41.4128,-16.28],b:[-38.28,-18.92],radius:.968}},
   brow:{center:[6,29.2],half:[64,2.7],chamfer:1.7},temple:{a:[63,27],b:[88,33],radius:2.5},nosePad:{center:[-40.48,-20.68],half:[4.312,9.152],rotation:16,arm:{a:[-38.72,-15.4],b:[-37.4,-20.24],radius:1.144},pivot:{center:[-37.4,-20.24],radius:1.848},note:'扁平椭圆鼻垫略向下外侧倾斜，位于鼻侧壳体前方；随收紧的结构一起内收，短支座连接，避免悬空黑片。佩戴角域为估计。'}}
 }
};
