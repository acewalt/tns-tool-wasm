const sdl=(body,extra='')=>`#include <os.h>
#include <SDL/SDL.h>
#include <stdio.h>
${extra}
int main(void){
 if(SDL_Init(SDL_INIT_VIDEO)<0)return 1;
 SDL_Surface *s=SDL_SetVideoMode(320,240,16,SDL_SWSURFACE);
 if(!s)return 2;
 ${body}
 while(!isKeyPressed(KEY_NSPIRE_ESC))SDL_PumpEvents();
 SDL_Quit();return 0;
}`;
module.exports=[
 {name:'sdl-gradient-c',files:{'main.c':sdl(`
 for(int y=0;y<240;y++){SDL_Rect r={0,y,320,1};SDL_FillRect(s,&r,SDL_MapRGB(s->format,y,255-y,80));}
 nSDL_Font *f=nSDL_LoadFont(NSDL_FONT_TINYTYPE,255,255,255);
 char text[96];sprintf(text,"Computed %d %.2f",6*7,1.25+2.5);nSDL_DrawString(s,f,12,12,text);
 printf("computed=%d float=%.2f\\n",6*7,1.25+2.5);fflush(stdout);SDL_Flip(s);`)},kind:'gradient'},
 {name:'cpp-multifile',files:{'main.cpp':sdl(`
 std::vector<int> v{31,7,4};std::sort(v.begin(),v.end());
 Scene scene;int sum=scene.sum(v);SDL_FillRect(s,NULL,SDL_MapRGB(s->format,shade(sum),17,231));SDL_Flip(s);`,
 '#include <vector>\n#include <algorithm>\n#include "scene.hpp"'),
 'scene.hpp':'#include <vector>\nclass Scene {public:template<class T> int sum(const T &v){int n=0;for(auto x:v)n+=x;return n;}};\nint shade(int);',
 'scene.cpp':'#include "scene.hpp"\nint shade(int value){return value*5;}'},kind:'cpp'},
 {name:'double-fractal',files:{'main.c':sdl(`
 for(int y=0;y<60;y++)for(int x=0;x<80;x++){
 double cr=(x-52)/24.0,ci=(y-30)/24.0,zr=0,zi=0;int k=0;
 while(zr*zr+zi*zi<4&&k<32){double t=zr*zr-zi*zi+cr;zi=2*zr*zi+ci;zr=t;k++;}
 SDL_Rect r={x*4,y*4,4,4};SDL_FillRect(s,&r,SDL_MapRGB(s->format,k*7,k*11,k*17));}
 SDL_Flip(s);`)},kind:'fractal'},
 {name:'animation-keyboard',files:{'main.c':sdl(`
 for(unsigned frame=1;!isKeyPressed(KEY_NSPIRE_ESC);frame++){
 int green=isKeyPressed(KEY_NSPIRE_ENTER)?255:0;
 SDL_FillRect(s,NULL,SDL_MapRGB(s->format,(frame*3)%256,green,31));SDL_Flip(s);SDL_PumpEvents();}
 `)},kind:'animation'},
 {name:'mixed-arm-lcd',files:{'main.c':`#include <os.h>
extern int color(void);static unsigned short pixels[320*240];
int main(){for(unsigned i=0;i<320*240;i++)pixels[i]=color();lcd_init(SCR_320x240_565);lcd_blit(pixels,SCR_320x240_565);while(!isKeyPressed(KEY_NSPIRE_ESC)){}return 0;}`,
 'color.S':'.syntax unified\n.arm\n.text\n.global color\n.type color,%function\ncolor:\n mov r0,#31\n bx lr\n'},kind:'arm'},
 {name:'allocation-pressure',files:{'main.c':`#include <os.h>
#include <stdlib.h>
static unsigned short pixels[320*240];
int main(){unsigned total=0;for(unsigned i=0;i<9000;i++){volatile unsigned char*p=malloc(8192);if(!p)return 3;p[8191]=7;total+=p[8191];free((void*)p);}
for(unsigned i=0;i<320*240;i++)pixels[i]=total==63000?0xffe0:0xf800;
lcd_init(SCR_320x240_565);lcd_blit(pixels,SCR_320x240_565);while(!isKeyPressed(KEY_NSPIRE_ESC)){}return 0;}`},kind:'allocation'},
 {name:'unsupported-lcd',files:{'main.c':'int main(){register unsigned r0 __asm__("r0")=1;__asm__ volatile("swi 0x20000f":"+r"(r0));return 0;}'},kind:'lcd'},
 {name:'unsupported-swi',files:{'main.c':'int main(){__asm__ volatile("swi 0x123456");return 0;}'},kind:'unsupported'},
 {name:'invalid-memory',files:{'main.c':'int main(){*(volatile int*)0x12340000=7;return 0;}'},kind:'memory'},
 {name:'infinite-loop',files:{'main.c':'int main(){for(;;)__asm__ volatile("nop");}'},kind:'infinite'},
 {name:'invalid-source',files:{'main.c':'int main(void){ this is not C; }'},kind:'compile-error'}
];
