#include "lab.h"
/* Grid movement, growth, tail collision and restart. */
int main(void){if(!init_game())return 1;int sx[280]={5,4,3},sy[280]={5,5,5},length=3,dx=1,dy=0,foodx=12,foody=5,dead=0;
 while(!isKeyPressed(KEY_NSPIRE_ESC)){
  if(isKeyPressed(KEY_NSPIRE_UP)&&dy!=1){dx=0;dy=-1;}if(isKeyPressed(KEY_NSPIRE_DOWN)&&dy!=-1){dx=0;dy=1;}
  if(isKeyPressed(KEY_NSPIRE_LEFT)&&dx!=1){dx=-1;dy=0;}if(isKeyPressed(KEY_NSPIRE_RIGHT)&&dx!=-1){dx=1;dy=0;}
  if(dead&&isKeyPressed(KEY_NSPIRE_SPACE)){sx[0]=5;sy[0]=5;length=3;dx=1;dy=0;dead=0;}
  if(!dead&&!(tick%4)){
   int nx=(sx[0]+dx+20)%20,ny=(sy[0]+dy+13)%13;
   for(int i=1;i<length-1;i++)if(sx[i]==nx&&sy[i]==ny)dead=1;
   if(nx==foodx&&ny==foody&&length<270){length++;foodx=(foodx+7)%20;foody=(foody+5)%13;}
   for(int i=length-1;i>0;i--){sx[i]=sx[i-1];sy[i]=sy[i-1];}sx[0]=nx;sy[0]=ny;
  }
  SDL_FillRect(screen,NULL,rgb(12,27,29));for(int i=0;i<length;i++)box(sx[i]*16+1,sy[i]*16+30,14,14,i?rgb(60,170,95):rgb(150,245,100));
  box(foodx*16+3,foody*16+32,10,10,rgb(245,100,80));text(5,7,dead?"SNAKE | Space: restart":"SNAKE LAB | Arrows | Esc");
  if(!(tick%16)){printf("snake tick=%u x=%d y=%d length=%d dead=%d\n",tick,sx[0],sy[0],length,dead);fflush(stdout);}frame();
 }done();return 0;}
