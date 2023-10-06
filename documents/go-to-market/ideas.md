# Ideas on what to work on next

## Look for youtubers promoting code productivity tools 1/2 day
This was harder than it seemed at the beginning

## Write an article about multi file patch generation 1 day

## Write inline 2 days
This should be pretty simple to implement and also will have a simple prompt, so no IQ loss.
No plan needs to be written for this either so quicker response time.
Still uses full advantage of the task comments to include other tabs

I think this would be tremendously useful for new users, after all I feel like you don't want to start with a multi file edit. 
This will also produce higher quality edits

## Play  around the current range identifying system
Only provides line numbers for lines that are eligible to be a start or and end of a range, for example blocks off code surrounded by blank lines

## Split up the task to first identify ranges of code to update, then update them
Will be more expensive, we'll speed up the edit a little bit
Might be a local optimization, aka will not improve the quality as much. For instance one of the big issues is range location, which is not solved by this approach
Although range location might be improved because there is less stuff in the prompt the model can be focused on

## Refactor and create a better abstraction for a code editing 5 days?
Limitations of the current abstraction:
- Resolution is stateful and produces side effects such as creating new files
- A stream where every item is an array off edits is confusing

Improvement ideas
- Convert this to some sort of queue of edits
- Once ac item is created it should be stateful and then keep being updated with a newer version of the edit
- Resolution should only be performed at the time when we are trying to make the edit, not when we are parsing the stream from LLM
- Application process should not be driven by the queue directly, but process the queue in its own way, with proper time intervals between items, ability to pause

## Double down on refactoring use case end fixing simple compile errors
- Makes for a good demo
- Might actually be a simpler problem to solve
- What wall this actually look like?

## Work on scripting 5 days
- Might be more immediately useful to actual companies
- Might interest Isaiah

## Add dynamic context providers 2 days

# Thoughts
I have not actually tried much promotion of my extension yet. I have yet to run the twitter campaigns, YouTube, try reaching out to influencers who will know what will go viral or not. I'm barely reaching out to any users, for instance I should try reaching out to my discord contacts.
I have not tried to go through the mailing list we have collected with Show Me.

- run the twitter campaigns, wait for YouTube [running]
- Look for influencers, harder
  - https://www.youtube.com/@Indently, 100k subs, 10k views per video,
- Reach out to discord contacts
- Reach out to mailing list (simply use mail chump?)


# YouTube learnings
- I might need better thumbnains as I'm not even looking at the title cwhen I browse YouTube. 
- I might want to create content that is not relevant to the extension directly
  - For example I can create a video version of the article, for example for caching prompt versions
- People create posts in the community, like with simple multiple question polls https://www.youtube.com/@Indently/community

# Re-record video's for mobile devices?
Likely reddit and twitter users are on mobile and will be super hard too see what is going on
Is terminal running actually that good to show off on mobile? Too many things going on :(

The demo is too complex for mobile, I think many people star repo's from mobile, I probably do at least half.

Create more edits

# Same videos will need to be used for tik tok

# make a video asking for help

# How to measure Wow

Comments on the video 
Stars on the repo

Suggestion to use the extension to complete your task
Complete issues of other projects to promote 

We get assigned issues, thats the job, we get paid for it
Issue context provider

You sit on the issue and see if it takes less time to implement it easier.

Record a video of you solving an issue and time the different parts of the process.