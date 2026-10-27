#include "lab.h"
/* Software ray casting with wall collision, shading and depth-based projection. */
static const char*map[]={"111111111111","100000100001","102000100001","100000000001","100011100001","100000000001","100000300001","111111111111"};
static int wall(double x,double y){int a=(int)x,b=(int)y;return a<0||a>=12||b<0||b>=8?1:map[b][a]-'0';}
int main(void){if(!init_game())return 1;double px=3.5,py=3.5,angle=0;int shots=0,prev=0;
 while(!isKeyPressed(KEY_NSPIRE_ESC)){
  angle+=(isKeyPressed(KEY_NSPIRE_RIGHT)-isKeyPressed(KEY_NSPIRE_LEFT))*.07;
  double motion=(isKeyPressed(KEY_NSPIRE_UP)-isKeyPressed(KEY_NSPIRE_DOWN))*.09;
  double nx=px+cos(angle)*motion,ny=py+sin(angle)*motion;if(!wall(nx,py))px=nx;if(!wall(px,ny))py=ny;
  int shoot=isKeyPressed(KEY_NSPIRE_SPACE);if(shoot&&!prev)shots++;prev=shoot;
  box(0,0,320,112,rgb(36,45,70));box(0,112,320,128,rgb(45,40,34));
  for(int col=0;col<160;col++){
   double a=angle+(col-80)*.0075,dx=cos(a)*.06,dy=sin(a)*.06,rx=px,ry=py,dist=0;int cell=0;
   while(!cell&&dist<16){rx+=dx;ry+=dy;dist+=.06;cell=wall(rx,ry);}dist*=cos(a-angle);if(dist<.1)dist=.1;
   int height=150/dist;if(height>214)height=214;int shade=210/(1+dist*.2);
   Uint32 c=cell==2?rgb(shade,40,45):cell==3?rgb(55,shade,70):rgb(shade,shade*3/4,shade/2);
   box(col*2,112-height/2,2,height,c);
  }
  box(145,184,30,56,rgb(shots%2?120:85,95,120));box(155,167,10,50,rgb(145,150,160));
  box(157,108,6,1,rgb(255,255,240));box(160,105,1,6,rgb(255,255,240));
  box(0,0,320,20,rgb(8,16,30));text(6,6,"RAY LAB | Arrows | Space: fire");
  if(!(tick%4)){printf("ray tick=%u x=%d y=%d angle=%d shots=%d\n",tick,(int)(px*100),(int)(py*100),(int)(angle*100),shots);fflush(stdout);}frame();
 }done();return 0;}
