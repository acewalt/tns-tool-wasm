#include "lab.h"
/* Scrolling world, fixed-point motion, ground/platform collision and jumping. */
int main(void){if(!init_game())return 1;int x=28*256,y=180*256,vx=0,vy=0,ground=1,jumps=0,prev=0;
 while(!isKeyPressed(KEY_NSPIRE_ESC)){
  int jump=isKeyPressed(KEY_NSPIRE_SPACE)||isKeyPressed(KEY_NSPIRE_ENTER);
  vx=(isKeyPressed(KEY_NSPIRE_RIGHT)-isKeyPressed(KEY_NSPIRE_LEFT))*640;
  if(jump&&!prev&&ground){vy=-1900;ground=0;jumps++;}prev=jump;
  x+=vx;if(x<0)x=0;if(x>1500*256)x=1500*256;vy+=100;if(vy>1800)vy=1800;
  int oldY=y;y+=vy;ground=0;
  const int platforms[][3]={{0,196,1600},{140,156,70},{280,128,80},{440,158,70},{620,120,100}};
  for(int i=0;i<5;i++)if(x/256+12>platforms[i][0]&&x/256<platforms[i][0]+platforms[i][2]&&oldY/256+16<=platforms[i][1]&&y/256+16>=platforms[i][1]&&vy>=0){y=(platforms[i][1]-16)*256;vy=0;ground=1;}
  int camera=x/256-100;if(camera<0)camera=0;
  SDL_FillRect(screen,NULL,rgb(48,112,180));
  for(int i=0;i<7;i++)box((i*90-camera/3)%420,60+(i%3)*18,40,10,rgb(220,240,250));
  for(int i=0;i<5;i++){box(platforms[i][0]-camera,platforms[i][1],platforms[i][2],18,rgb(55,145,69));box(platforms[i][0]-camera,platforms[i][1]+18,platforms[i][2],40,rgb(103,69,48));}
  for(int i=0;i<24;i++)box(70+i*60-camera,160+(i%3)*-18,5,7,rgb(255,220,50));
  box(x/256-camera,y/256,12,16,rgb(255,124,69));box(x/256-camera+8,y/256+3,3,3,rgb(20,30,50));
  box(0,0,320,22,rgb(15,30,60));text(7,7,"SALTO LAB | Arrows + Space | Esc");
  if(!(tick%16)){printf("platform tick=%u x=%d y=%d jumps=%d ground=%d\n",tick,x/256,y/256,jumps,ground);fflush(stdout);}frame();
 }done();return 0;}
