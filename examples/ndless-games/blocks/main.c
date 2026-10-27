#include "lab.h"
/* Falling blocks: rotation, hard drop, line removal and seven shapes. */
static unsigned char board[16][10];
static const unsigned short shapes[7]={0x00f0,0x0660,0x0270,0x0360,0x0630,0x0170,0x0470};
static int block(int kind,int rot,int x,int y){for(int i=0;i<rot;i++){int t=x;x=y;y=3-t;}return(shapes[kind]>>(y*4+x))&1;}
static int fits(int kind,int rot,int px,int py){for(int y=0;y<4;y++)for(int x=0;x<4;x++)if(block(kind,rot,x,y)){int a=px+x,b=py+y;if(a<0||a>=10||b>=16||(b>=0&&board[b][a]))return 0;}return 1;}
int main(void){if(!init_game())return 1;int kind=2,rot=0,px=3,py=0,placed=0,lines=0,over=0,prevUp=0,prevSpace=0;
 while(!isKeyPressed(KEY_NSPIRE_ESC)){
  int up=isKeyPressed(KEY_NSPIRE_UP),space=isKeyPressed(KEY_NSPIRE_SPACE),move=isKeyPressed(KEY_NSPIRE_RIGHT)-isKeyPressed(KEY_NSPIRE_LEFT);
  if(!over){if(!(tick%3)&&fits(kind,rot,px+move,py))px+=move;if(up&&!prevUp&&fits(kind,(rot+1)%4,px,py))rot=(rot+1)%4;
   int lock=0;if(space&&!prevSpace){while(fits(kind,rot,px,py+1))py++;lock=1;}
   if(!(tick%12)||isKeyPressed(KEY_NSPIRE_DOWN)){if(fits(kind,rot,px,py+1))py++;else lock=1;}
   if(lock){for(int y=0;y<4;y++)for(int x=0;x<4;x++)if(block(kind,rot,x,y)&&py+y>=0)board[py+y][px+x]=kind+1;placed++;
    for(int y=15;y>=0;y--){int full=1;for(int x=0;x<10;x++)if(!board[y][x])full=0;if(full){for(int r=y;r>0;r--)memcpy(board[r],board[r-1],10);memset(board[0],0,10);lines++;y++;}}
    kind=(kind+3)%7;px=3;py=0;rot=0;if(!fits(kind,rot,px,py))over=1;
   }
  }else if(space&&!prevSpace){memset(board,0,sizeof(board));over=0;placed=0;}
  prevUp=up;prevSpace=space;SDL_FillRect(screen,NULL,rgb(12,18,35));
  box(17,29,124,194,rgb(70,85,110));box(19,31,120,192,rgb(18,28,46));
  for(int y=0;y<16;y++)for(int x=0;x<10;x++)if(board[y][x])box(20+x*12,32+y*12,10,10,rgb(40+board[y][x]*25,200-board[y][x]*12,100+board[y][x]*17));
  if(!over)for(int y=0;y<4;y++)for(int x=0;x<4;x++)if(block(kind,rot,x,y))box(20+(px+x)*12,32+(py+y)*12,10,10,rgb(245,195,70));
  text(6,7,"BLOCKS LAB | Arrows + Space");text(158,64,"UP: ROTATE");text(158,84,"SPACE: DROP");if(over)text(158,130,"GAME OVER");
  if(!(tick%8)){printf("blocks tick=%u x=%d y=%d rotation=%d placed=%d lines=%d\n",tick,px,py,rot,placed,lines);fflush(stdout);}frame();
 }done();return 0;}
