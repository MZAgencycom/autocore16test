import { useState } from 'react';
import { AlertTriangle, User, Car, MoreHorizontal } from 'lucide-react';

const DuplicateClientAlert = ({ duplicateData, extractedData, onDecision }) => {
  const [selectedClientId, setSelectedClientId] = useState(
    duplicateData.clients.length > 0 ? duplicateData.clients[0].id : null
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    duplicateData.vehicles.length > 0 ? duplicateData.vehicles[0].id : null
  );
  const [createNewClient, setCreateNewClient] = useState(false);
  const [createNewVehicle, setCreateNewVehicle] = useState(duplicateData.vehicles.length === 0);
  
  const handleSubmit = () => {
    onDecision({
      cancelled: false,
      useExistingClient: !createNewClient,
      selectedClientId: selectedClientId,
      useExistingVehicle: !createNewVehicle,
      selectedVehicleId: selectedVehicleId
    });
  };
  
  const handleCancel = () => {
    onDecision({ cancelled: true });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-lg shadow-lg max-w-lg w-full overflow-hidden">
        <div className="p-4 bg-amber-500/10 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-lg">Client potentiellement existant</h3>
            <p className="text-sm text-muted-foreground">
              Un ou plusieurs clients similaires ont été trouvés. Comment souhaitez-vous procéder?
            </p>
          </div>
        </div>
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center">
              <User className="h-4 w-4 mr-2" />
              Client
            </h4>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="useExistingClient"
                  name="clientChoice"
                  checked={!createNewClient}
                  onChange={() => setCreateNewClient(false)}
                  className="h-4 w-4"
                />
                <label htmlFor="useExistingClient" className="text-sm font-medium">
                  Utiliser un client existant
                </label>
              </div>
              
              {!createNewClient && duplicateData.clients.length > 0 && (
                <div className="pl-6 space-y-2">
                  {duplicateData.clients.map(client => (
                    <div key={client.id} className="border rounded-md p-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`client-${client.id}`}
                          name="selectedClient"
                          checked={selectedClientId === client.id}
                          onChange={() => setSelectedClientId(client.id)}
                          className="h-4 w-4"
                        />
                        <label htmlFor={`client-${client.id}`} className="text-sm font-medium">
                          {client.first_name} {client.last_name}
                        </label>
                      </div>
                      <div className="pl-6 text-xs text-muted-foreground">
                        {client.email && <p>Email: {client.email}</p>}
                        {client.phone && <p>Téléphone: {client.phone}</p>}
                        {client.address && <p>Adresse: {client.address}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="createNewClient"
                  name="clientChoice"
                  checked={createNewClient}
                  onChange={() => setCreateNewClient(true)}
                  className="h-4 w-4"
                />
                <label htmlFor="createNewClient" className="text-sm font-medium">
                  Créer un nouveau client
                </label>
              </div>
              
              {createNewClient && (
                <div className="pl-6 border rounded-md p-3">
                  <p className="text-sm">{extractedData.client.firstName} {extractedData.client.lastName}</p>
                  {extractedData.client.email && <p className="text-xs text-muted-foreground">Email: {extractedData.client.email}</p>}
                  {extractedData.client.phone && <p className="text-xs text-muted-foreground">Téléphone: {extractedData.client.phone}</p>}
                  {extractedData.client.address && <p className="text-xs text-muted-foreground">Adresse: {extractedData.client.address}</p>}
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center">
              <Car className="h-4 w-4 mr-2" />
              Véhicule
            </h4>
            
            {duplicateData.vehicles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="useExistingVehicle"
                    name="vehicleChoice"
                    checked={!createNewVehicle}
                    onChange={() => setCreateNewVehicle(false)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="useExistingVehicle" className="text-sm font-medium">
                    Utiliser un véhicule existant
                  </label>
                </div>
                
                {!createNewVehicle && (
                  <div className="pl-6 space-y-2">
                    {duplicateData.vehicles.map(vehicle => (
                      <div key={vehicle.id} className="border rounded-md p-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`vehicle-${vehicle.id}`}
                            name="selectedVehicle"
                            checked={selectedVehicleId === vehicle.id}
                            onChange={() => setSelectedVehicleId(vehicle.id)}
                            className="h-4 w-4"
                          />
                          <label htmlFor={`vehicle-${vehicle.id}`} className="text-sm font-medium">
                            {vehicle.make} {vehicle.model}
                          </label>
                        </div>
                        <div className="pl-6 text-xs text-muted-foreground">
                          {vehicle.registration && <p>Immat.: {vehicle.registration}</p>}
                          {vehicle.vin && <p>VIN: {vehicle.vin}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="createNewVehicle"
                name="vehicleChoice"
                checked={createNewVehicle}
                onChange={() => setCreateNewVehicle(true)}
                className="h-4 w-4"
              />
              <label htmlFor="createNewVehicle" className="text-sm font-medium">
                Créer un nouveau véhicule
              </label>
            </div>
            
            {createNewVehicle && (
              <div className="pl-6 border rounded-md p-3">
                <p className="text-sm">{extractedData.vehicle.make} {extractedData.vehicle.model}</p>
                {extractedData.vehicle.registration && <p className="text-xs text-muted-foreground">Immat.: {extractedData.vehicle.registration}</p>}
                {extractedData.vehicle.vin && <p className="text-xs text-muted-foreground">VIN: {extractedData.vehicle.vin}</p>}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end space-x-3">
          <button type="button" className="btn-outline" onClick={handleCancel}>Annuler</button>
          <button type="button" className="btn-primary" onClick={handleSubmit}>Continuer</button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateClientAlert;