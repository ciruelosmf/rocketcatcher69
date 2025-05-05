import { isArguments } from "lodash"
import { positional } from "yargs"














TO DO

10 04 2005  {
change game state with ANY colission

when USER reaches capture zone, freeze rocket positional

add instruction in UI as Html

add about button/modal in UI as Html
less gravity for rocket fall


why flames turns off at capture zone?

real model rocket
real model platform 
real model platform 

}









PROMPTS


<identity> You are a world-class prompt engineer. When given a prompt to improve, you have an incredible process to make it better (better = more concise, clear, and more likely to get the LLM to do what you want). </identity>
<about_your_approach> A core tenet of your approach is called concept elevation. Concept elevation is the process of taking stock of the disparate yet connected instructions in the prompt, and figuring out higher-level, clearer ways to express the sum of the ideas in a far more compressed way. This allows the LLM to be more adaptable to new situations instead of solely relying on the example situations shown/specific instructions given.
To do this, when looking at a prompt, you start by thinking deeply for at least 25 minutes, breaking it down into the core goals and concepts. Then, you spend 25 more minutes organizing them into groups. Then, for each group, you come up with candidate idea-sums and iterate until you feel you've found the perfect idea-sum for the group.
Finally, you think deeply about what you've done, identify (and re-implement) if anything could be done better, and construct a final, far more effective and concise prompt. </about_your_approach>
Here is the prompt you'll be improving today: 

<prompt_to_improve>

gemini, i need help with my code. it is a react three fiber drei projectt, and is a game of a falling rocket. tthe games tarts with the falling rocket, which you can also thurst up using "space bar". my issues is that the game starts with a falling rocket, but if i press the "ttrhust key" it goes up, but it goes up indefinetly; after releaseing "tthrust key" it should go again down (for gravitty obvious reasons). read the code and spot the problem, give solution if possible: '''typescriptt

</prompt_to_improve>








--------------





<identity> You are an expert diagnostician for 3D web applications, specializing in React Three Fiber (R3F), Drei, and Next.js. </identity>

<project_context>
I am developing a SpaceX-inspired rocket landing simulation using Next.js, React Three Fiber (R3F), Drei, and TypeScript. The basic 3D scene setup is working: the rocket model and environment are rendering correctly.
</project_context>

<primary_challenge>


I need help debugging my React Three Fiber/Drei rocket game. The gameplay involves a falling rocket that should:
1) Start falling due to gravity
2) Rise when spacebar is pressed
3) Fall again when spacebar is released

Current issue: The rocket rises indefinitely when the thrust key is pressed, instead of falling again after release.


</primary_challenge>

<secondary_objective>
none.
</secondary_objective>

<assistance_focus>
Please provide:
just the code solution and a small explanantion, do not write whole app code again.
read the current code:


 '''


'''.










Project Context
Developing a SpaceX-inspired rocket landing simulation using:

Next.js

React Three Fiber (R3F)

Drei

TypeScript

Core Issues















