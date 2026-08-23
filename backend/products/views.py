from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Product, Favorite
from .serializers import CategorySerializer, ProductSerializer, FavoriteSerializer
from accounts.permissions import IsOwnerOrReadOnly, IsOwnerUser


    @action(detail=False, methods=["post"], permission_classes=[IsOwnerOrReadOnly])
    def analyze_image(self, request):
        from services.ai_product_service import AIProductService
        
        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"success": False, "error": "No image provided"})
            
        if image_file.size > 5 * 1024 * 1024:
            return Response({"success": False, "error": "File too large. Maximum size is 5MB."})
            
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if image_file.content_type not in allowed_types:
            return Response({"success": False, "error": "Invalid file type. Only JPEG, PNG, and WebP are allowed."})
            
        try:
            data = AIProductService.analyze_product_image(image_file.read(), image_file.content_type)
            return Response({"success": True, "data": data})
        except Exception as e:
            return Response({"success": False, "error": str(e)})

    @action(detail=False, methods=["post"], permission_classes=[IsOwnerOrReadOnly])
    def generate_description(self, request):
        from services.ai_product_service import AIProductService
        
        try:
            description = AIProductService.generate_description(request.data)
            return Response({"success": True, "description": description})
        except Exception as e:
            return Response({"success": False, "error": str(e)})

    @action(detail=False, methods=["post"], permission_classes=[IsOwnerOrReadOnly])
    def enhance_image(self, request):
        from services.image_enhancement_service import ImageEnhancementService
        from django.http import HttpResponse
        
        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"success": False, "error": "No image provided"})
            
        if image_file.size > 10 * 1024 * 1024:
            return Response({"success": False, "error": "File too large. Maximum size is 10MB."})
            
        try:
            enhanced_bytes, mime_type = ImageEnhancementService.enhance_product_image(image_file.read())
            response = HttpResponse(enhanced_bytes, content_type=mime_type)
            # Custom header to indicate success if needed
            response["X-Enhancement-Success"] = "True"
            return response
        except Exception as e:
            return Response({"success": False, "error": str(e)}, status=400)
\n\nclass CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('display_order', 'name')
    serializer_class = CategorySerializer
    permission_classes = [IsOwnerOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Non-owners only see active categories
        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'is_owner', False)):
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
    def reorder(self, request):
        updates = request.data
        if not isinstance(updates, list):
            return Response({'error': 'Expected a list of updates'}, status=400)
            
        categories = []
        for update in updates:
            try:
                cat = Category(
                    id=int(update['id']), 
                    display_order=int(update.get('display_order', 0))
                )
                categories.append(cat)
            except (KeyError, ValueError, TypeError):
                continue
                
        if categories:
            Category.objects.bulk_update(categories, ['display_order'])
        return Response({'status': 'reordered'})

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').all().order_by('display_order', '-created_at')
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'is_active', 'is_in_stock']
    search_fields = ['name', 'brand', 'description']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'barcode_lookup']:
            return [AllowAny()]
        return [IsOwnerUser()]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Non-owners only see active products
        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'is_owner', False)):
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def barcode_lookup(self, request):
        # Throttle manually for this specific action to prevent AI abuse
        if not request.user.is_authenticated:
            throttle = AnonRateThrottle()
            if not throttle.allow_request(request, self):
                return Response({'error': 'Rate limit exceeded. Please wait.'}, status=429)
        barcode = request.query_params.get('barcode')
        if not barcode:
            return Response({'error': 'Barcode is required'}, status=400)
            
        # 1. Check local DB
        local_product = Product.objects.filter(sku=barcode).first()
        if local_product:
            return Response({
                'source': 'local',
                'product': ProductSerializer(local_product, context={'request': request}).data
            })
            
        import requests
        headers = {'User-Agent': 'SmartKirana/1.0'}
        
        # 2. Check Open Food Facts API (Primary)
        try:
            url_off = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
            response_off = requests.get(url_off, headers=headers, timeout=5)
            if response_off.status_code == 200:
                data_off = response_off.json()
                if data_off.get('status') == 1:
                    product_data = data_off.get('product', {})
                    return Response({
                        'source': 'external',
                        'product': {
                            'name': product_data.get('product_name', ''),
                            'brand': product_data.get('brands', ''),
                            'unit': product_data.get('quantity', ''),
                            'image_url': product_data.get('image_front_url', ''),
                            'sku': barcode
                        }
                    })
        except Exception as e:
            print('Open Food Facts API error:', str(e))
            
        # 3. Check UPCitemdb API (Fallback)
        try:
            url_upc = f"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}"
            response_upc = requests.get(url_upc, headers=headers, timeout=5)
            if response_upc.status_code == 200:
                data_upc = response_upc.json()
                if data_upc.get('code') == 'OK' and len(data_upc.get('items', [])) > 0:
                    item = data_upc['items'][0]
                    return Response({
                        'source': 'external',
                        'product': {
                            'name': item.get('title', ''),
                            'brand': item.get('brand', ''),
                            'unit': item.get('size', ''),
                            'image_url': item.get('images', [])[0] if item.get('images') else '',
                            'sku': barcode
                        }
                    })
        except Exception as e:
            print('UPCitemdb API error:', str(e))
            
        # 4. Check Gemini AI (Ultimate Fallback for Indian Products)
        import os
        gemini_key = os.environ.get('GEMINI_API_KEY')
        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel('gemini-3.6-flash')
                
                prompt = f"""
                Identify the FMCG grocery product commonly sold in India with the barcode (EAN/UPC) {barcode}.
                Return ONLY raw JSON (no markdown, no backticks) with the following structure:
                {{
                  "name": "Product Name (e.g. Tide Plus Jasmine & Rose)",
                  "brand": "Brand Name (e.g. Tide)",
                  "unit": "Size/Weight (e.g. 1kg, 500ml)"
                }}
                If you absolutely do not know, return {{"error": "not found"}}
                """
                response = model.generate_content(prompt)
                
                # Clean up response
                result_text = response.text.strip()
                if result_text.startswith('```json'):
                    result_text = result_text[7:]
                if result_text.endswith('```'):
                    result_text = result_text[:-3]
                    
                import json
                data_ai = json.loads(result_text.strip())
                
                if 'error' not in data_ai and data_ai.get('name'):
                    return Response({
                        'source': 'external',
                        'product': {
                            'name': data_ai.get('name', ''),
                            'brand': data_ai.get('brand', ''),
                            'unit': data_ai.get('unit', ''),
                            'image_url': '',
                            'sku': barcode
                        }
                    })
            except Exception as e:
                print('Gemini AI Barcode error:', str(e))
                
        return Response({'source': 'not_found'})

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
    def vision_lookup(self, request):
        import os
        import json
        
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'success': False, 'error': 'No image provided'})
            
        # Security: Validate file size (max 5MB) to prevent Memory Exhaustion DoS
        if image_file.size > 5 * 1024 * 1024:
            return Response({'success': False, 'error': 'File too large. Maximum size is 5MB.'})
            
        # Security: Validate MIME type to prevent malicious uploads
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if image_file.content_type not in allowed_types:
            return Response({'success': False, 'error': 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'})
            
        gemini_key = os.environ.get('GEMINI_API_KEY')
        if not gemini_key:
            return Response({'success': False, 'error': 'AI is not configured. Missing API Key.'})
            
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            
            # Use gemini-3.6-flash for fast multimodal tasks
            model = genai.GenerativeModel('gemini-3.6-flash')
            
            image_data = {
                "mime_type": image_file.content_type or 'image/jpeg',
                "data": image_file.read()
            }
            
            prompt = """
            Analyze this product image and extract the following details in raw JSON format (no markdown tags, no code blocks):
            {
              "name": "Product Name (e.g. Tide Plus Jasmine & Rose)",
              "brand": "Brand Name (e.g. Tide)",
              "unit": "Size/Weight (e.g. 1kg, 500ml)",
              "description": "A very brief 1-sentence description."
            }
            If you cannot identify the product, return {"error": "Could not identify product"}
            """
            
            response = model.generate_content([prompt, image_data])
            
            # Clean up the response text in case it includes markdown json blocks
            result_text = response.text.strip()
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]
                
            data = json.loads(result_text.strip())
            
            if 'error' in data:
                return Response({'success': False, 'error': data['error']})
                
            return Response({'success': True, 'product': data})
            
        except Exception as e:
            print('Gemini API Error:', str(e))
            return Response({'success': False, 'error': str(e)})

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
    def reorder(self, request):
        updates = request.data
        if not isinstance(updates, list):
            return Response({'error': 'Expected a list of updates'}, status=400)
            
        products = []
        for update in updates:
            try:
                prod = Product(
                    id=int(update['id']), 
                    display_order=int(update.get('display_order', 0))
                )
                products.append(prod)
            except (KeyError, ValueError, TypeError):
                continue
                
        if products:
            Product.objects.bulk_update(products, ['display_order'])
        return Response({'status': 'reordered'})

class FavoriteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        return Favorite.objects.select_related('product', 'product__category').filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
