#include "lab.h"
/* Paddle collision, score, CPU opponent and key-controlled player. */
int main(void){if(!init_game())return 1;int paddle=88,ai=88,x=160,y=120,dx=3,dy=2,score=0;
 while(!isKeyPressed(KEY_NSPIRE_ESC)){
  paddle+=(isKeyPressed(KEY_NSPIRE_DOWN)-isKeyPressed(KEY_NSPIRE_UP))*5;if(paddle<24)paddle=24;if(paddle>182)paddle=182;
  ai+=(y>ai+24?2:-2);if(ai<24)ai=24;if(ai>182)ai=182;
  x+=dx;y+=dy;if(y<26||y>229)dy=-dy;
  if(x<25&&y>=paddle&&y<paddle+40){dx=3;score++;}if(x>289&&y>=ai&&y<ai+40)dx=-3;
  if(x<8||x>312){x=160;y=120;dx=-dx;}
  SDL_FillRect(screen,NULL,rgb(9,20,35));for(int i=28;i<240;i+=16)box(159,i,2,8,rgb(75,90,105));
  box(16,paddle,6,40,rgb(120,245,170));box(294,ai,6,40,rgb(130,180,250));box(x,y,6,6,rgb(255,225,90));
  text(7,7,"PONG LAB | Up/Down | Esc");
  if(!(tick%16)){printf("pong tick=%u paddle=%d x=%d y=%d score=%d\n",tick,paddle,x,y,score);fflush(stdout);}frame();
 }done();return 0;}
