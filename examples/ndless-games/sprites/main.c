#include "lab.h"
/* External BMP asset, color key, clipping and 64-256 independently moving sprites. */
typedef struct{int x,y,dx,dy;} Particle;
int main(void){if(!init_game())return 1;Particle*p=malloc(sizeof(Particle)*256);if(!p)return 2;
 for(int i=0;i<256;i++){p[i].x=(i*37)%312;p[i].y=28+(i*59)%200;p[i].dx=i%5-2;if(!p[i].dx)p[i].dx=3;p[i].dy=i%3+1;}
 SDL_Surface*sprite=SDL_LoadBMP("sprite.bmp");if(sprite)SDL_SetColorKey(sprite,SDL_SRCCOLORKEY,SDL_MapRGB(sprite->format,255,0,255));int count=64,prev=0;
 while(!isKeyPressed(KEY_NSPIRE_ESC)){
  int space=isKeyPressed(KEY_NSPIRE_SPACE);if(space&&!prev&&count<256)count*=2;prev=space;
  SDL_FillRect(screen,NULL,rgb(5,13,28));int sum=0;
  for(int i=0;i<count;i++){p[i].x+=p[i].dx;p[i].y+=p[i].dy;if(p[i].x<0||p[i].x>312)p[i].dx=-p[i].dx;if(p[i].y<27||p[i].y>232)p[i].dy=-p[i].dy;sum+=p[i].x;
   if(sprite){SDL_Rect d={p[i].x,p[i].y,0,0};SDL_BlitSurface(sprite,NULL,screen,&d);}else box(p[i].x,p[i].y,5,5,rgb(70+i%180,160+i%80,245));
  }
  box(0,0,320,23,rgb(14,28,50));text(5,7,"SPRITE LAB | Space: more | Esc");
  if(!(tick%8)){printf("sprites tick=%u count=%d checksum=%d asset=%d\n",tick,count,sum,sprite!=NULL);fflush(stdout);}frame();
 }if(sprite)SDL_FreeSurface(sprite);free(p);done();return 0;}
