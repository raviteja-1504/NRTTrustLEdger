
Dashboard should be accessible only to superadmin and school admin.
Make all the Quick Actions work. I think they sould be same from the Individual pages.
How many recent activities do we show or Is there another Info can be shown Instead of recent activities (I think no one cares about recent activities).
Notification Icon on the top is not now working (And I thinkk that is not requrired), since we do not have any 1-1 conov notification might not be helpful and for tracking we have audit log (which super admin and school admin) can view.

And Search bar should work, how do we make it work with huge data , how does back-end supports we cannot make API calls everytime that will make it a mess, or in search bar we can support navigating to the respective pages (Students page, admissions page) and all also that should be based on Role, if they can have access to that page or or not? Is it simpler to have a Search bar ? If it is easy we can have it or think about removing and keeping something useful.


And when you close the lest side bar, logo should be visible but that is not visible.

In Student Information Systemt everything is looking fine, but we should consider a case where for a student there can be fee dues from the previous year also in the same school, so that should due from previous academic years should be visible in the Finance section of the student and over all Fee Due should include that. (In db we can store the outstanding fee JSON with academic year to Fee value). 

In Attendance, we have everything fine, but the student count might not be very small we can have 80 to 100 or more per a class section, so we should have pagination or arrow to next page and see., How do we manage attendance heatmap for huge student base,
If strength is less everything looks fine, basically this should be adjusted based on the count we get from backend.
We should make Export CSV work.
And How do we get such a huge data from backend, how do we manage it, how do we make it efficient? not making API calls everything which gives bulk payload.

Time table loooks fine, but still I have concerns about handling such a huge data from back-end, conflicts and there can be many teachers for each subject and other cases.
Make Export PDF work.

Exams & Grade looks fine, we have also made role based access for this and teach subjet wise unlock generating report card is something should be taken care of, generate and send to parents whatsapp those things.
I think communication will be handled by the backend but still that's a huge work and we should make it efficient development.

Coming to Library there are many things we should handle from backend and this should be made visible to super admin and school admin.
Since other are not required to know about the Library stock and all right. 

Admissions page is fine, we can add leads and shift them (drag and drop), but how do we handle the load from backend?
We should also add a delete or close the lead button with a reason (successfull enrollment or at what stage the lead is dropped and other info).

In fees Class: this should be a drop down (class) and (section). and the above cards info we should get once and student grid can load while shifting.
Current studen grid is having a Glitch problem when hovered (shaking), need to fix it and make it look smooth and neat.
We need to implement the backend intergration for send over SMS to all (only for the selected class and section), individual student send reminder, collect payment.

Fee Structure is a complex right, so fee can be different for each student (some might want karatee class,music class some want only swimming class), so how do we handle it.
The Idea is good, but we need to think about the backend implementation. and how to make it efficient. and general use cases.

Coming to Scholarships once the fee structure is added for a student, we can add scholarships to the student and the fee structure should be updated accordingly.
We should also show this much waiver is provided in the fee structure.

Actually we should have each Individual student free structure (tution fee, other fees, etc.) concession offered approved by whom and all that data this is important.

In expenses we will make it very simple for now, give add expenses button with some drops of expense category and just update it.
We can remove Budget vs Actual because there will be no monthly budget. Total monthly expense should be shown. and compare with the previous month that is enough.

Staff Directory is looking good, we should also have edit button to the admin. (some contact information edit and all).

In communication we cannot have openrate and all, total sent is fine.
Broadcast messages, emails, and SMS to parents and staff this is fine, but for now its complex.we can just hide the communication in the MVP?

communication,notice and events we can add later, first we provide the CRM for the school usage, then we can think about parent usage.

Analytics is good,but again my worry is about backend API and how do we handle the huge data,Instead of Recent activity in the dash board we can show this Report and Analytics.
Only yoy enrollment graph, grade distribution for that year.collected fee for that year till now. We have revenue overview for the month wise.
In dash board that revenue overview should be monthly wise (Include all months).
Year wise we give at the bottom. last year vs this year. (if available) or think of something useful which we can show.
Remove Reports from Analytics.

Audit logs are important, but there can be huge logs right ? Teacher changes, Account changes, admissions changes etc.
Currently we are showing Today that is fine, but we should also have a button to export audit logs monthly wise. and year wise, we do not show then just export option.


Coming to settings, general is fine.
Security what we can add??
What billing?
Just Roles and permissions is what I see useful think about the settings section again, keep what is required and remove rest.


Login page is required, how do we handle the login.
Based on the login we have to differentiate and get role and show only required.

Should we go with username and password (But for each teacher or employee of the school we have to create a username and password).
Which method for login will be better and easy to handle?
Admin should create user name,password and assign role to the user. (In setting this can be done)?
Think about this.
For each school we will have different URL (portal.schoolCRM.meridianschool.com).

What if school has different branches?

Man lot of questions, but these can be solvable. have to think better.

Now, we have almost done with frontend, lets work on backend and make it work with frontend.
So, this is all like getting huge data from the backend and showing on UI.
But how do we get the data, what data is required, how do we make it efficient?
We cannot make API calls with entire school data right, we should have seperate API for each section and some top bar static data we can get at once and below dynamic we can get via API.

Think about making it more efficient and less cost to backend and no a ugly API calling machine everytime.

Let's discuss this and make a plan. what is better and how to do it.

SQL schema and what all tables will be required, schema for those tables these things we should plan.

Our DB schema should be for Multi school (we will sell the CRM to multiple sschools).
So we need to have a multi tenant architecture.

For now real communications we cannot support (we have to buy so many things like SMS, Email, WhatsApp, etc.)

Admissions WhatsApp is fine, they can direclty chat with the user.from whatsapp WEB.

Anyways implement the front-end with making an backend call, in backend we will handle it do we have support now or not.