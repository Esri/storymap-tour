define(["dojo/dom"], 
	function(dom)
	{
		return function LoadingIndicator(spinnerId, messageId)
		{
			var spinner = null;
			var itemCount = 0;
			var spinnerNode = dom.byId(spinnerId);
			var messageNode = dom.byId(messageId);
	
			this.init = function()
			{
				if( this.spinner != null )
					return;
	
				var spinnerConfig = {
					lines: 16,
					length: 7,
					width: 7,
					radius: 30,
					rotate: 0,
					color: '#000',
					speed: 1.1,
					trail: 25,
					shadow: true,
					hwaccel: true,
					className: 'spinner',
					top: 4,
					left: 6
				};
				// Fix for IE9 in dev mode
				//spinner = {start: function(){}, stop: function(){}, spin: function(){}};
				spinner = new Spinner(spinnerConfig).spin(spinnerNode);
			};
			
			this.start = function()
			{
				! spinner && this.init();
	
				if( ! this.itemCount ) {
					spinner.spin(spinnerNode);
					spinnerNode.style.visibility = "visible";
				}
				// Alternative to allow multiple simultaneous task to share the same spinner
				// itemCount++;
				itemCount = 1;
			};
			
			this.stop = function()
			{
				itemCount--;
				if( itemCount <= 0 ){
					spinner.stop();
					spinnerNode.style.visibility = "hidden";
					itemCount = 0;
				}
				
				if( messageNode )
					messageNode.style.visibility = "hidden";
			};
			
			this.setMessage = function(message, isFail)
			{
				spinnerNode.style.display = "block";
					
				if( messageNode ) {
					if( isFail )
						messageNode.style.marginTop = "-50px";
					
					messageNode.innerHTML = message;
					messageNode.style.visibility = "visible";
					messageNode.style.display = "block";
				}
			};
			
			this.forceHide = function()
			{
				spinnerNode.style.display = "none";
				
				if( messageNode )
					messageNode.style.display = "none";
			};
		};
	}
);