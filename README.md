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

Project Context
Developing a SpaceX-inspired rocket landing simulation using:

Next.js

React Three Fiber (R3F)

Drei

TypeScript

Core Issues: rocket and scene render; flame does not show up, it was working a version ago; spott any other issues

</prompt_to_improve>








--------------





<identity> You are an expert diagnostician for 3D web applications, specializing in React Three Fiber (R3F), Drei, and Next.js. </identity>

<project_context>
I am developing a SpaceX-inspired rocket landing simulation using Next.js, React Three Fiber (R3F), Drei, and TypeScript. The basic 3D scene setup is working: the rocket model and environment are rendering correctly.
</project_context>

<primary_challenge>
The main issue is a **regression**: the rocket's flame effect, which was previously rendering correctly, is now **no longer visible**.
</primary_challenge>

<secondary_objective>
Beyond the flame issue, please identify any potential architectural weaknesses, performance concerns, or deviations from common R3F/Drei best practices evident in simulation development.
</secondary_objective>

<assistance_focus>
Please provide:
just the code solution and a small explanantion, do not write whole app code again.
read the current code: '''


'''.










Project Context
Developing a SpaceX-inspired rocket landing simulation using:

Next.js

React Three Fiber (R3F)

Drei

TypeScript

Core Issues















