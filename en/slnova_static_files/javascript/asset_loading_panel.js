/**
 * Utility script containing factory functions for creating and other functions for managing loading bar panels. Html loaded 
 * for page must include assets/asset_loading_panel.html in the body in order to use this script. The purpose of this script
 * is to allow the number of loading panels in the document to be more dynamic instead of statically declaring all of them
 * in the html for the page document, to make it easier to manage and refer to these similar html elements (no more 
 * getElementById("blah").style = "block"/"none" all over the place), and to remove redundant element nodes in html files 
 * (if all the loading panels were declared in html, they would only differ in id, so they're pretty much clutter). 
 * 
 * Ideas for improvement:
 * - Panel creation argument for width? (For fitting more text).
 * - Allow stacks to set style properties like width, opacity, color, etc of all panels pushed to them.
 * - Implement animations for collapsing and expanding panels. 
 * - Add utility methods to make it easier to place panels and stacks into a div in the document (not sure how much easier
 * 		this can be made than doing it manually unless a style sheet can be passed as an argument).
 */

var loadingPanels = {}; // Map from panel names to visible loading bar panels.
var panelStacks = {}; // Map from stack names to visible panel stacks.

// name: The string name used to refer to the created loading panel. Also becomes the id attribute of the loading panel 
//		outermost element.
// message: A string for the initial message to display above the loading bar. Optional. Default message is "Loading...".

/*
 * Returns an HTML element for a loading panel.
 */
function createLoadingPanel (name, message, opacity=1.0)
{
	var newPanel = document.getElementById("loadingPanel").cloneNode(true);
	newPanel.id = name;
	if (message)
		newPanel.getElementsByClassName("message")[0].innerHTML = message;
	newPanel.style.display = "block";
	newPanel.style.opacity = ""+opacity;
	
	loadingPanels[name] = newPanel;
	
	return newPanel;
}

// name: String used to identify a loading panel.
/*
 * Removes the specified loading panel from the document and removes references to the panel created by the factory.
 * (This means none of the other utility functions can be used to update the panel). 
 */
function destroyLoadingPanel (name)
{
	var panel = document.getElementById(name);
	if(panel && panel.parentNode)
		panel.parentNode.removeChild(panel);
	
	delete loadingPanels[name];
}

// name: String used to identify a loading panel.
// message: String to update message of specified panel.
/*
 * Updates the message of the loading panel specified by name to display the text message.
 */
function updatePanelMessage (name, message)
{
	var panel = document.getElementById(name);
	panel.getElementsByClassName("message")[0].innerHTML = message;
}

// name: String used to identify a loading panel.
// percentage: A number in the range [0, 100] indicating how much percent full the loading bar should be.
/*
 * Update the progress of the progress bar of the loading panel specified by name to be percentage% complete.
 */
function updatePanelProgress (name, percentage)
{
	var panel = document.getElementById(name);
	panel.getElementsByClassName("barIndicator")[0].style.width = percentage+"px"; // max width is 100.
}

// name: String used to identify a loading panel.
// animationTime: Total time in milliseconds it should take to perform the collapsing animation.
/*
 * Performs animation to hide visibility of the loading panel specified by name and put it into the collapsed state.
 * Does nothing if the panel is already collapsed.
 */
function collapsePanel (name, animationTime=1000)
{

}

// name: String used to identify a loading panel.
// animationTime: Total time in milliseconds it should take to perform the expanding animation.
/*
 * Performs an animation to make a panel visible again and put it into the expanded state. Does nothing if the panel
 * is already expanded.
 */
function expandPanel (name, animationTime=1000)
{

}

// name: The string name used to refer to the created panel stack. Also becomes the id attribute of the panel stack 
//		outermost element.
// maxPanels: The maximum number of panels that can fit into the stack without a scroll bar appearing to view additional panels.
/*
 * Returns an HTML element for a panel stack.
 */
function createPanelStack(name, maxPanels)
{
	var newStack = document.getElementById("panelStack").cloneNode(true);
	newStack.id = name;
	newStack.style.display = "block";
	
	if(maxPanels)
	{
		var panelHeight = 
			parseInt(window.getComputedStyle(document.getElementById("loadingPanel")).getPropertyValue('height'));
		newStack.style.height = (maxPanels*panelHeight)+"px";
		newStack.style.overflowY = "auto";
	}
	
	panelStacks[name] = newStack;
	
	return newStack;
}

// name: String used to identify a panel stack.
// destroyPanels: Optional. True to also destroy all loading panels in the stack, false to only remove them from stack.
//		defaults to true.
function destroyPanelStack(name, destroyPanels=true)
{
	for (child of panelStacks[name].childNodes)
	{
		if (destroyPanels)
			destroyLoadingPanel(child.id);
		else
			removePanelFromStack(child.id, name);
	}
	
	var stack = document.getElementById(name);
	if(stack && stack.parentNode)
		stack.parentNode.removeChild(panel);
	
	delete panelStacks[name];
}

// panelName: String used to identify a loading panel.
// stackName: String used to identify a panel stack.
/*
 * Places the loading panel identified by panelName as the next loading panel inside the panel stack identified by stackName.
 */
function pushPanelToStack(panelName, stackName)
{
	var panelStack = panelStacks[stackName];
	panelStack.appendChild(loadingPanels[panelName]);
}

// panelName: String used to identify a loading panel.
// stackName: String used to identify a panel stack.
/*
 * Removes the loading panel identified by panelName from the panel stack identified by stackName (panels shift over in
 * stack to fill the gap made). Does not remove factory created references to panel, so the panel may still be updated
 * by other utility functions or placed into another stack.
 * Note: Use destroyLoadingPanel instead if you do not plan to reuse the loading panel, as destroyLoadingPanel removes
 * the panel from the document (and therefore the stack) and releases factory references in one go.
 */
function removePanelFromStack(panelName, stackName)
{
	var panelStack = panelStacks[stackName];
	panelStack.removeChild(loadingPanels[panelName]);
}